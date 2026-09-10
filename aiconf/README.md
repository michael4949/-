# AI 会期雷达 📡

全国**人工智能会议 / 展会 / 峰会**的档期总览。一个单文件 HTML，双击就能用；
接上定时抓取后，数据每 6 小时自动刷新。

这是仓库里的**第三个独立子系统**，与根目录的「AI 爆款工厂」和 `scout/`（GitHub AI 雷达）互不影响。

---

## 为什么不是「浏览器直接实时爬」

这是整个设计的起点。纯前端页面想直连活动行、会议桶、主办方官网，会撞上三堵墙：

| 障碍 | 说明 |
|---|---|
| **CORS 跨域** | 浏览器禁止页面读取第三方域名响应体，`fetch` 必然被拦 |
| **反爬与 JS 渲染** | 列表页多为动态渲染 + 风控，即使无跨域也拿不到干净数据 |
| **没有统一开放 API** | 国内会议信息散落在票务平台、协会官网、公众号、厂商 IR 页 |

所以「实时」不靠浏览器硬抓，而是拆成**三层数据管线**，越往下越实时：

```
L1  内置快照      种子库 + 上次抓取结果，内联在 HTML 里
                  → 秒开、离线可用、file:// 双击也能跑
L2  定时抓取      GitHub Actions 每 6 小时跑 crawl.py，刷新 data/events.json
                  → 页面后台静默拉取，同源、无跨域问题
L3  AI 实时检索   页内填自己的 Gemini Key，用 Google Search grounding 联网搜
                  → 真·实时；抓取发生在 Google 服务端，绕开 CORS
```

L3 的思路和仓库根目录的应用一致 —— README 里那句「服务端抓取，没有浏览器跨域问题」，
说的就是这件事。

---

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | **单文件前端**。筛选 / 四视图 / 导出 / AI 检索全在里面，无外部 JS 依赖 |
| `data/seed.json` | 人工整理的种子库，**可直接手工编辑**，爬虫会与它合并 |
| `data/events.json` | 爬虫产出的成品数据，页面运行时拉取它 |
| `config.json` | 关键词、主题映射、城市表、各数据源开关，**都可调** |
| `crawl.py` | 聚合爬虫：多源适配器 → 归一化 → 去重合并 |
| `build.py` | 把 `events.json` 内联回 `index.html`，让它成为真正的单文件 |

---

## 用法

### 只想看看
直接双击 `index.html`。用的是内联快照，断网也能看。

### 本地刷新数据
```bash
python3 aiconf/crawl.py        # 抓取 → data/events.json
python3 aiconf/build.py        # 内联进 index.html
```
只用 Python 标准库，**不需要 pip install 任何东西**。

调试用参数：
```bash
python3 aiconf/crawl.py --dry-run        # 只打印不写文件
python3 aiconf/crawl.py --only gemini    # 只跑某个源
python3 aiconf/crawl.py --skip gemini    # 跳过某个源
python3 aiconf/crawl.py --seed-only      # 不联网，仅用种子库重建
```

### 开启自动刷新
工作流 `.github/workflows/update-ai-events.yml` 已就绪，每 6 小时跑一次。
它需要合并到默认分支后 `schedule` 才会生效（GitHub 的规则），也可以在 Actions 页面手动触发。

**可选**：在仓库 `Settings → Secrets and variables → Actions` 里加 `GEMINI_API_KEY`，
即可启用联网检索源。不配也能跑，只是少一个数据源。

### 发布成公开网址
纯静态，扔哪都行：
- **Vercel** —— 导入仓库，Root Directory 填 `aiconf`，无需任何环境变量
- **GitHub Pages** —— 把 `aiconf/` 作为发布目录
- **任意静态托管** —— 上传 `index.html` + `data/` 即可

部署后 L2 的同源拉取才会生效（`file://` 下会被 CORS 拦，此时自动回退到内联快照）。

---

## 数据源

| 源 | 类型 | 说明 |
|---|---|---|
| `seed.json` | 人工 | 53 场年度性大会打底，保证页面永远有内容 |
| `huodongxing` | 站点 | 活动行搜索列表 |
| `bagevent` | 站点 | 百格活动（会议桶） |
| `infoq` | 站点 | 极客邦 AICon / QCon |
| `ccf` | 站点 | 中国计算机学会会议预告 |
| `gemini` | LLM 联网 | Google Search grounding，**站点改版时最稳的兜底** |

**站点适配器是 best-effort 的。** 这些站点会改版、会加风控，正则失效是常态 ——
所以爬虫把「抓到 0 条」当作警告而非失败，单源异常也只影响自己。
数据洞察页的「数据源状态」卡片会如实显示每个源的抓取结果。
真要长期稳定，`gemini` 源是最可靠的那条路径。

---

## ⚠️ 关于「预估档期」

**当前种子库里的日期，绝大多数是按往年规律推算的，不是官方公告。**

年度性大会（WAIC 每年 7 月上旬、进博会固定 11/5–11/10、云栖大会 9 月下旬……）
档期高度规律，推算值有参考价值 —— 但**仍可能变动**。

页面对此有三重标注，不含糊：
- 卡片上打 `预估档期` 虚线徽章，悬停显示推算依据
- 结果行提示「其中 N 场为预估档期，报名前请核实」
- 导出的 `.ics` 日历条目里，标题加 `［预估］` 前缀，描述里带 ⚠️ 警告

爬虫或 AI 检索抓到官方挂牌信息后，会自动把该条 `dateStatus` 升级为 `confirmed` 并补上官网链接。

**这个页面是导航工具，不是报名入口。** 决定要去之前，请点会议名进官网核实。

---

## 数据结构

```jsonc
{
  "id": "waic-2027",
  "name": "2027 世界人工智能大会…",
  "shortName": "WAIC",                       // 日历视图用短名
  "type": "expo",                            // summit|expo|academic|devcon|meetup|hackathon|training
  "org": "国家发改委 · 上海市人民政府",
  "city": "上海", "province": "上海",
  "venue": "世博中心 · 世博展览馆",
  "start": "2027-07-08", "end": "2027-07-11",
  "dateStatus": "estimated",                 // confirmed（官方公布）| estimated（按规律推算）| tbd（仅知月份）
  "topics": ["大模型", "具身智能", "AI治理"],  // 见 config.json 的 topic_rules
  "fee": "mixed",                            // free|paid|invite|mixed
  "scale": "超大型",
  "url": "https://…",
  "sourceNote": "WAIC 固定于每年 7 月上旬，按规律推算",
  "desc": "一句话说明值不值得去",
  "source": "seed"                           // seed | crawler:<适配器> | ai
}
```

**想加会议？** 直接往 `data/seed.json` 的 `events` 数组里加一条，跑 `build.py` 即可。

---

## 主题标签覆盖

除了常规的大模型 / 智能体 / 具身智能 / 算力芯片，特意保留了两条容易被漏掉的细分主线：

- **`Token经济`** —— 推理成本、单位 Token 定价、量化、投机解码、KV Cache 复用
- **`FDE·交付落地`** —— Forward Deployed Engineer、驻场交付、私有化部署、行业解决方案

这两个标签在 `config.json` 的 `topic_rules` 里定义了关键词，爬虫会自动打标。
