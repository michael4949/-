#!/usr/bin/env node
/* ============================================================
   HeyGen 工具箱 · 小瓦特·练 数字人素材生成
   在任意可联网的机器上运行，Node 18+ 即可（无需安装依赖）

   1) 列出你账号下的形象（含 v3 look 与抠像能力）
        node heygen-kit.js avatars
   2) 列出中文音色
        node heygen-kit.js voices zh
   3) 试渲染一条（确认形象与音色效果，约 1 分钟）
        node heygen-kit.js test
   4) 批量渲染全部台词并下载（约 117 条）
        node heygen-kit.js render
   5) 断点续跑 / 只补失败的
        node heygen-kit.js render --resume

   API Key 从环境变量读取：
        Windows  set HEYGEN_API_KEY=你的key
        Mac/Linux  export HEYGEN_API_KEY=你的key
   ============================================================ */

const fs = require('fs');
const path = require('path');

const KEY = process.env.HEYGEN_API_KEY;
const API = 'https://api.heygen.com';
const OUT = path.join(__dirname, 'clips');
const MANIFEST = path.join(OUT, 'manifest.json');

/* ---- 三个角色的形象与音色：跑完 avatars / voices 后把 ID 填进来 ---- */
const CAST = {
  jianhu: { avatar_id: '', voice_id: '', name: '监护人 陈志远' },
  diaodu: { avatar_id: '', voice_id: '', name: '值班调度员 林岚' },
  zhiban: { avatar_id: '', voice_id: '', name: '值班负责人 周建国' }
};

/* ---- 渲染参数 ---- */
const OPT = {
  format: 'webm',                  // webm = 透明通道（主用）；mp4 = 纯色背景兜底
  api: 'auto',                     // auto | v3 | v2   auto 先试 v3，被拒再退 v2
  resolution: '1080p',             // v3 用；v2 用下面的 width/height
  aspect_ratio: '9:16',            // 竖版半身，贴合陪练舱左栏
  width: 720, height: 1280,        // v2 尺寸
  bgColor: '#0a1524',              // 仅 format=mp4 时生效
  speed: 1.0,
  concurrency: 3,                  // 同时提交的渲染数，按你的套餐并发上限调
  pollEvery: 8000,
  pollMax: 120
};

const H = () => ({ 'X-Api-Key': KEY, 'Content-Type': 'application/json' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, url, body) {
  const r = await fetch(API + url, {
    method, headers: H(), body: body ? JSON.stringify(body) : undefined
  });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch (e) { j = { raw: txt }; }
  if (!r.ok) throw new Error(`${method} ${url} → ${r.status} ${txt.slice(0, 300)}`);
  return j;
}

function need() {
  if (!KEY) { console.error('缺少 HEYGEN_API_KEY 环境变量'); process.exit(1); }
}

/* ---------------- 列形象 ---------------- */
async function cmdAvatars() {
  need();
  const j = await api('GET', '/v2/avatars');
  const list = (j.data && (j.data.avatars || j.data)) || [];
  const talking = (j.data && j.data.talking_photos) || [];
  console.log('\n=== 形象（avatars）共 %d 个 ===', list.length);
  list.forEach(a => console.log(
    (a.avatar_name || a.name || '').padEnd(28),
    (a.gender || '-').padEnd(8),
    a.avatar_id));
  if (talking.length) {
    console.log('\n=== 照片形象（talking photos）共 %d 个 ===', talking.length);
    talking.forEach(a => console.log((a.talking_photo_name || '').padEnd(28), a.talking_photo_id));
  }
  console.log('\n挑三个，把 avatar_id 填进本文件顶部的 CAST。');
}

/* ---------------- 列 v3 形象（透明 WebM 必须用这个） ---------------- */
async function cmdLooks() {
  need();
  let all = [];
  for (const t of ['digital_twin', 'studio', 'photo']) {
    try {
      const j = await api('GET', `/v3/avatars/looks?avatar_type=${t}`);
      const arr = (j.data && (j.data.looks || j.data.avatars || j.data)) || [];
      arr.forEach(a => all.push(Object.assign({ _type: t }, a)));
    } catch (e) { /* 该类型无权限或为空 */ }
  }
  if (!all.length) { console.log('未取到 v3 look，说明账号还在旧版 Studio，请用 avatars 命令并把 OPT.api 设为 v2'); return; }
  console.log('\n=== v3 形象（look）共 %d 个 ===', all.length);
  for (const a of all) {
    const id = a.id || a.look_id || a.avatar_id;
    let eng = a.supported_api_engines;
    if (!eng) {
      try { const d = await api('GET', `/v3/avatars/looks/${id}`); eng = (d.data || {}).supported_api_engines; } catch (e) { }
    }
    console.log(
      String(a.name || a.look_name || '').padEnd(28),
      String(a._type).padEnd(14),
      String((eng || []).join('/')).padEnd(26),
      id);
  }
  console.log('\n透明 WebM 需要形象支持抠像（matting）。近期创建的 Digital Twin 与 Studio Avatar 一般都支持；');
  console.log('若渲染时报 matting 相关错误，说明该形象未训练抠像，换一个或把 OPT.format 改成 mp4。');
}

/* ---------------- 列音色 ---------------- */
async function cmdVoices(filter) {
  need();
  const j = await api('GET', '/v2/voices');
  let list = (j.data && (j.data.voices || j.data)) || [];
  if (filter) {
    const f = filter.toLowerCase();
    list = list.filter(v => (v.language || '').toLowerCase().includes(f) ||
      (v.locale || '').toLowerCase().includes(f) ||
      (f === 'zh' && /chinese|mandarin|中文/i.test((v.language || '') + (v.name || ''))));
  }
  console.log('\n=== 音色 共 %d 个 ===', list.length);
  list.forEach(v => console.log(
    (v.name || '').padEnd(26),
    (v.gender || '-').padEnd(8),
    (v.language || v.locale || '-').padEnd(20),
    v.voice_id));
  console.log('\n男声两个、女声一个，填进 CAST 的 voice_id。');
}

/* ---------------- 提交渲染 ---------------- */
let API_MODE = null;   // 首条成功后锁定，避免每条都试探

async function submitV3(line, c) {
  const body = {
    type: 'avatar',
    avatar_id: c.avatar_id,
    voice_id: c.voice_id,
    script: line.text,
    title: line.id,
    resolution: OPT.resolution,
    aspect_ratio: OPT.aspect_ratio,
    output_format: OPT.format            // webm 即透明；不可同时传 background
  };
  if (OPT.format !== 'webm') body.background = { type: 'color', value: OPT.bgColor };
  const j = await api('POST', '/v3/videos', body);
  return { id: (j.data || {}).video_id, api: 'v3' };
}

async function submitV2(line, c) {
  const body = {
    video_inputs: [{
      character: { type: 'avatar', avatar_id: c.avatar_id, avatar_style: 'normal' },
      voice: { type: 'text', input_text: line.text, voice_id: c.voice_id, speed: OPT.speed },
      background: OPT.format === 'webm' ? { type: 'transparent' } : { type: 'color', value: OPT.bgColor }
    }],
    dimension: { width: OPT.width, height: OPT.height }
  };
  const j = await api('POST', '/v2/video/generate', body);
  return { id: j.data.video_id, api: 'v2' };
}

async function submit(line) {
  const c = CAST[line.role];
  if (!c || !c.avatar_id || !c.voice_id) {
    throw new Error(`角色 ${line.role} 的 avatar_id / voice_id 未填写`);
  }
  const mode = API_MODE || OPT.api;
  if (mode === 'v2') return submitV2(line, c);
  if (mode === 'v3') return submitV3(line, c);
  try {
    const r = await submitV3(line, c); API_MODE = 'v3';
    console.log('  · 使用 v3 接口（透明 WebM）');
    return r;
  } catch (e) {
    console.log('  · v3 不可用，回退 v2：' + String(e.message).slice(0, 120));
    const r = await submitV2(line, c); API_MODE = 'v2';
    return r;
  }
}

async function status(videoId, mode) {
  if ((mode || API_MODE) === 'v3') {
    try {
      const j = await api('GET', `/v3/videos/${videoId}`);
      const d = j.data || {};
      return { status: d.status, video_url: d.video_url, error: d.error };
    } catch (e) { /* 回退旧状态接口 */ }
  }
  const r = await fetch(`${API}/v1/video_status.get?video_id=${videoId}`, { headers: H() });
  const j = await r.json();
  return j.data || {};
}

async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('下载失败 ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf.length;
}

/* ---------------- 批量渲染 ---------------- */
async function cmdRender(resume) {
  need();
  const lines = JSON.parse(fs.readFileSync(path.join(__dirname, 'lines.json'), 'utf8'));
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  let man = {};
  if (fs.existsSync(MANIFEST)) man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  const todo = lines.filter(l => {
    if (!resume) return true;
    const m = man[l.id];
    return !(m && m.file && fs.existsSync(path.join(OUT, m.file)));
  });
  console.log(`待渲染 ${todo.length} / ${lines.length} 条`);

  let done = 0, fail = 0;
  for (let i = 0; i < todo.length; i += OPT.concurrency) {
    const batch = todo.slice(i, i + OPT.concurrency);
    await Promise.all(batch.map(async line => {
      try {
        const sub = await submit(line);
        const vid = sub.id;
        man[line.id] = { role: line.role, tag: line.tag, text: line.text, video_id: vid, api: sub.api, status: 'processing' };
        for (let k = 0; k < OPT.pollMax; k++) {
          await sleep(OPT.pollEvery);
          const st = await status(vid, sub.api);
          if (st.status === 'completed' || st.status === 'success') {
            const file = line.id + (OPT.format === 'webm' ? '.webm' : '.mp4');
            const size = await download(st.video_url, path.join(OUT, file));
            man[line.id] = { role: line.role, tag: line.tag, text: line.text, video_id: vid, api: sub.api, file, size, format: OPT.format, status: 'ok' };
            done++;
            console.log(`  ✓ ${line.id} ${(size / 1024 / 1024).toFixed(1)}MB  ${line.text.slice(0, 22)}…`);
            return;
          }
          if (st.status === 'failed') throw new Error(JSON.stringify(st.error || st));
        }
        throw new Error('轮询超时');
      } catch (e) {
        fail++;
        man[line.id] = { role: line.role, tag: line.tag, text: line.text, status: 'failed', error: String(e.message || e) };
        console.log(`  × ${line.id}  ${String(e.message || e).slice(0, 120)}`);
      } finally {
        fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 1));
      }
    }));
    console.log(`进度 ${Math.min(i + OPT.concurrency, todo.length)}/${todo.length}　成功 ${done}　失败 ${fail}`);
  }
  console.log(`\n完成。成功 ${done}，失败 ${fail}。清单：${MANIFEST}`);
  if (fail) console.log('失败的可以再跑一次：node heygen-kit.js render --resume');
}

/* ---------------- 单条试渲染 ---------------- */
async function cmdTest() {
  need();
  const line = {
    id: 'TEST', role: 'jianhu', tag: 'test',
    text: '断开培训三线1163开关。'
  };
  console.log('提交试渲染…');
  const sub = await submit(line);
  const vid = sub.id;
  console.log('video_id =', vid, '（' + sub.api + '接口）　轮询中…');
  for (let k = 0; k < OPT.pollMax; k++) {
    await sleep(OPT.pollEvery);
    const st = await status(vid, sub.api);
    process.stdout.write('.');
    if (st.status === 'completed' || st.status === 'success') {
      if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
      const f = path.join(OUT, 'TEST' + (OPT.format === 'webm' ? '.webm' : '.mp4'));
      await download(st.video_url, f);
      console.log('\n完成：', f, '\n在线地址：', st.video_url);
      return;
    }
    if (st.status === 'failed') { console.log('\n失败：', JSON.stringify(st)); return; }
  }
  console.log('\n轮询超时');
}

/* ---------------- 入口 ---------------- */
const cmd = process.argv[2];
const arg = process.argv[3];
(async () => {
  try {
    if (cmd === 'avatars') await cmdAvatars();
    else if (cmd === 'looks') await cmdLooks();
    else if (cmd === 'voices') await cmdVoices(arg);
    else if (cmd === 'test') await cmdTest();
    else if (cmd === 'render') await cmdRender(arg === '--resume');
    else {
      console.log(`用法：
  node heygen-kit.js avatars            列出你账号下的形象（v2）
  node heygen-kit.js looks              列出 v3 形象与抠像能力（透明 WebM 用）
  node heygen-kit.js voices zh          列出中文音色
  node heygen-kit.js test               试渲染一条
  node heygen-kit.js render             批量渲染全部台词
  node heygen-kit.js render --resume    只补未完成的`);
    }
  } catch (e) {
    console.error('出错：', e.message);
    process.exit(1);
  }
})();
