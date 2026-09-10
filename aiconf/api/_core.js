/**
 * AI 会期雷达 · 实时检索后端代理（核心逻辑）
 *
 * 为什么需要它：
 *   密钥绝不能出现在前端 —— HTML 是明文的，写进去等于公开送人。
 *   这个函数跑在服务端，密钥只存在环境变量里，浏览器永远拿不到。
 *
 * 顺带解决两件事：
 *   · 跨域 —— 页面调的是自己的 /api/ai-search，同源，没有 CORS 问题。
 *   · 国内直连 —— Gemini 接口在国内访问不畅，但这里是海外节点在调，
 *     访客只跟你的站点通信。
 *
 * 成本控制（公开站点最容易被忽略的一点）：
 *   · 响应带 s-maxage，由 CDN 边缘缓存兜住，同一检索 6 小时内只真正花一次钱。
 *   · 默认只接受预设检索项。否则别人可以用无限变化的查询串绕开缓存，
 *     每次都真实打到模型上，把你的额度刷干。
 *   · 需要开放自由检索时，设环境变量 AICONF_ALLOW_FREEFORM=true。
 *
 * 文件名以 _ 开头，Vercel 不会把它当成一个路由。
 */

const MODEL_DEFAULT = "gemini-2.5-flash";
const CACHE_PRESET = 6 * 3600;      // 预设检索：缓存 6 小时，与定时爬虫同频
const CACHE_FREEFORM = 3600;        // 自由检索：缓存 1 小时
const MAX_FREEFORM_LEN = 60;

/** 预设检索项。服务端与前端共用同一份 key，前端只发 key，不发任意字符串。 */
export const PRESETS = {
  upcoming:  "未来三个月中国大陆举办的人工智能会议、展会、峰会",
  "llm-agent": "中国近期的大模型、智能体 Agent 开发者大会与技术峰会",
  infra:     "中国近期的 AI Infra、推理优化、Token 成本、算力芯片主题峰会",
  embodied:  "中国近期的具身智能、人形机器人大会与展会",
  fde:       "中国近期的企业 AI 落地、交付实践、FDE 前向部署工程师、行业解决方案沙龙与闭门会",
  academic:  "中国近期的人工智能学术会议，例如 CCF、CAAI 主办的论坛与年会",
};

export const PRESET_LABELS = {
  upcoming:  "未来三个月 · 全部",
  "llm-agent": "大模型与智能体",
  infra:     "AI Infra · Token 成本",
  embodied:  "具身智能与机器人",
  fde:       "企业落地与 FDE 交付",
  academic:  "学术会议",
};

const SCHEMA_HINT = `严格只输出一个 JSON 数组，不要任何解释文字，不要 markdown 代码块。
数组每个元素形如：
{"name":"会议全称","org":"主办方","city":"举办城市（线上填「线上」，未定填「待定」）","venue":"场馆（未知填空字符串）","start":"YYYY-MM-DD","end":"YYYY-MM-DD","url":"官网链接（没有填空字符串）","topics":["主题标签"],"fee":"free|paid|invite|mixed","desc":"一句话说明值不值得去","confirmed":true}
要求：
· 只收录中国大陆举办（含线上中文场）的、与人工智能相关的会议/展会/峰会/开发者大会/沙龙。
· confirmed：官方已正式公布确切日期填 true；按往年规律推测填 false。
· 日期必须是具体的 YYYY-MM-DD；只知道月份就填该月 1 日并把 confirmed 设为 false。
· topics 从这些里选：大模型、智能体、具身智能、算力·芯片、AI Infra、Token经济、FDE·交付落地、AIGC·多模态、自动驾驶、AI+行业、开源、AI治理、投融资、开发者生态。
· 至多 20 条，优先近期且规模大的。没有可靠结果就输出 []。`;

const json = (body, status, cacheSeconds) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // 没有 CORS 头 = 别的站点无法在浏览器里盗用你这个代理
      "Cache-Control": cacheSeconds
        ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}`
        : "no-store",
    },
  });

/** 模型偶尔会裹一层 ``` 或前后加话，抠出第一个合法 JSON 数组。 */
function extractArray(text) {
  const fence = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  const src = fence ? fence[1] : text;
  const i = src.indexOf("[");
  if (i < 0) return [];
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) {
      try { const v = JSON.parse(src.slice(i, j + 1)); return Array.isArray(v) ? v : []; }
      catch { return []; }
    }
  }
  return [];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const FEES = new Set(["free", "paid", "invite", "mixed"]);

/** 模型输出是不可信输入：逐字段校验，不合格的整条丢掉。 */
function toEvent(x, today) {
  if (!x || typeof x !== "object") return null;
  const name = String(x.name || "").trim().slice(0, 120);
  if (name.length < 4) return null;
  const start = String(x.start || "").trim();
  if (!ISO.test(start)) return null;
  let end = String(x.end || "").trim();
  if (!ISO.test(end) || end < start) end = start;

  const slug = name.toLowerCase().replace(/[^a-z0-9一-龥]+/g, "-").slice(0, 32).replace(/^-|-$/g, "");
  const url = String(x.url || "").trim();
  return {
    id: `ai-${slug || "event"}-${start}`,
    name,
    shortName: null,
    type: "summit",
    org: String(x.org || "").trim().slice(0, 60) || "待补充",
    city: String(x.city || "").trim().slice(0, 20) || "待定",
    province: "待定",
    venue: String(x.venue || "").trim().slice(0, 60) || "待定",
    start, end,
    dateStatus: x.confirmed === true ? "confirmed" : "estimated",
    topics: Array.isArray(x.topics) ? x.topics.map(t => String(t).slice(0, 16)).filter(Boolean).slice(0, 6) : [],
    fee: FEES.has(x.fee) ? x.fee : "mixed",
    scale: "待定",
    url: /^https?:\/\//.test(url) ? url.slice(0, 300) : null,
    sourceNote: `本站实时检索于 ${today}`,
    desc: String(x.desc || "").trim().slice(0, 160),
    source: "ai",
  };
}

export async function handleSearch(request, env) {
  const url = new URL(request.url);
  const key = env?.GEMINI_API_KEY;
  const allowFree = String(env?.AICONF_ALLOW_FREEFORM || "").toLowerCase() === "true";

  // 探针：前端用它判断本站是否已接入实时检索，据此决定显示哪种界面
  if (url.searchParams.has("probe")) {
    return json({
      ok: true,
      ready: Boolean(key),
      allowFreeform: allowFree,
      presets: Object.entries(PRESET_LABELS).map(([id, label]) => ({ id, label })),
    }, 200, 300);
  }

  if (request.method !== "GET") return json({ ok: false, error: "只支持 GET" }, 405);
  if (!key) {
    return json({ ok: false, code: "not_configured",
      error: "本站尚未配置检索密钥。请在托管平台的环境变量里设置 GEMINI_API_KEY。" }, 503);
  }

  const presetId = url.searchParams.get("scope") || "";
  const freeform = (url.searchParams.get("q") || "").trim();

  let scopeText, cacheFor;
  if (PRESETS[presetId]) {
    scopeText = PRESETS[presetId];
    cacheFor = CACHE_PRESET;
  } else if (freeform && allowFree) {
    if (freeform.length > MAX_FREEFORM_LEN) {
      return json({ ok: false, code: "too_long", error: `自由检索词最长 ${MAX_FREEFORM_LEN} 字` }, 400);
    }
    scopeText = `中国大陆的人工智能相关会议，检索方向：${freeform}`;
    cacheFor = CACHE_FREEFORM;
  } else {
    return json({ ok: false, code: "bad_scope",
      error: freeform ? "本站未开放自由检索，请改用预设检索项" : "请指定检索项" }, 400);
  }

  const today = new Date().toISOString().slice(0, 10);
  const model = env?.AICONF_MODEL || MODEL_DEFAULT;
  const prompt = `今天是 ${today}。请用 Google 搜索查找：${scopeText}\n\n${SCHEMA_HINT}`;

  let resp;
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2 },
        }),
      });
  } catch {
    return json({ ok: false, code: "upstream_unreachable", error: "无法连接检索服务，请稍后再试" }, 502);
  }

  if (!resp.ok) {
    // 上游报错原文可能带密钥片段，绝不透传给浏览器
    const code = resp.status === 429 ? "rate_limited" : resp.status === 400 ? "bad_key" : "upstream_error";
    const msg = { rate_limited: "检索配额已用尽，请稍后再试",
                  bad_key: "本站的检索密钥无效，请联系站点维护者",
                  upstream_error: "检索服务暂时不可用" }[code];
    return json({ ok: false, code, error: msg }, resp.status === 429 ? 429 : 502);
  }

  let text = "";
  try {
    const data = await resp.json();
    text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  } catch {
    return json({ ok: false, code: "bad_response", error: "检索结果解析失败" }, 502);
  }

  const events = extractArray(text).map(x => toEvent(x, today)).filter(Boolean);
  return json({ ok: true, events, count: events.length, scope: presetId || freeform,
                model, generatedAt: new Date().toISOString() }, 200, cacheFor);
}
