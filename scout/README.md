# GitHub AI 雷达 🛰️

每天自动爬取 GitHub 上**最新 + 高 star** 的 AI 相关项目，向你确认一次，确认后由 AI 分析「厉害在哪」，
生成一份**自包含、可离线、可下载**的 HTML 报告并留存归档。

这是一个独立子系统，**不依赖也不改动**仓库根目录下的「AI调研报告」React 应用。

---

## 它怎么工作

```
 ① 爬取          ② 确认            ③ 分析+生成              ④ 留存/下载
crawl.py  ──▶  你确认要哪些  ──▶  写 confirmed JSON  ──▶  reports/*.html
   │              (问答卡片)      + generate_report.py        + index.html 画廊
   ▼                                                          + 直接发给你下载
data/candidates-<日期>.json
```

- **两条赛道**
  - 🆕 **新星(rising)**：最近 `rising_window_days` 天内**创建**、却已破 `min_rising` star —— 抓“最新且窜升”。
  - 🔥 **热推(active)**：star 量 ≥ `min_active`、最近 `active_pushed_window_days` 天内有推送 —— 抓“仍在高速迭代的明星项目”。
- **跨天去重**：之前日子给你看过的仓库默认不再重复（记录在 `data/seen.json`）。
- **限速友好**：只用 GitHub 搜索 API（10 次/分钟）；README 走 `raw.githubusercontent.com`（**不计** API 限速）。
- **「厉害在哪」由 AI 写**：爬虫负责采集事实（star/语言/topics/README 摘录），分析由我（Claude）基于这些事实撰写。

## 文件

| 文件 | 作用 |
|---|---|
| `config.json` | 所有阈值/时间窗/搜索查询，**可随意调** |
| `gh.py` | GitHub 访问助手（搜索 + raw README + 限速处理） |
| `crawl.py` | 爬虫 → `data/candidates-<日期>.json` |
| `generate_report.py` | 已确认 JSON → `reports/ai-radar-<日期>.html` + 画廊 |
| `data/` | 候选、已确认、`seen.json` 去重表 |
| `reports/` | 生成的 HTML 报告 + `index.html` 归档画廊 |

---

## 每日 Runbook（我在每天的会话里执行）

```bash
python3 scout/crawl.py            # 1) 抓取今日候选并打印清单
```
2) 我把候选清单用**问答卡片**发给你确认（要哪些 / 全要 / 我来挑）。
3) 你确认后，我把入选项目 + 我写的「厉害在哪」写入 `scout/data/confirmed-<日期>.json`。
4) 生成报告：
```bash
python3 scout/generate_report.py   # 读 data/confirmed-<今天>.json，产出 HTML
```
5) 我把报告 `git commit && push` 留存，并直接把 HTML 发给你下载。

### 已确认 JSON 结构（`data/confirmed-<日期>.json`）

直接复制对应候选对象的字段，再补三个字段：`category`、`why_impressive`、`highlights`。

```jsonc
{
  "date": "2026-05-30",
  "title": "GitHub AI 雷达 · 每日精选",     // 可选
  "intro": "今日看点……",                    // 可选，报告开头导语
  "items": [
    {
      // —— 以下直接来自 candidates-<日期>.json 的候选对象 ——
      "rank": 1, "full_name": "owner/repo", "name": "repo", "owner": "owner",
      "owner_avatar": "https://…", "html_url": "https://github.com/owner/repo",
      "description": "…", "stars": 1234, "forks": 56, "open_issues": 7,
      "language": "Python", "topics": ["llm","agents"], "license": "MIT",
      "homepage": "https://…", "created_at": "2026-…", "pushed_at": "2026-…",
      "lane": "rising", "is_new_to_you": true, "readme_excerpt": "…",
      // —— 以下由我补充 ——
      "category": "智能体框架",
      "why_impressive": "支持 **粗体**、`代码`、- 列表、[链接]() 的多段分析…",
      "highlights": ["一句话亮点 1", "一句话亮点 2", "一句话亮点 3"]
    }
  ]
}
```

---

## 设成每天自动跑（Scheduled Trigger）

容器是临时的，关掉会话脚本不会自己跑，所以「每日」靠 **Claude Code on the web 的定时触发器**驱动：

1. 打开 https://code.claude.com/ 选中本仓库 → **Settings / Triggers** → 新建 **Scheduled trigger**。
2. 频率设为每天一次（例如每天 09:00），分支选 `claude/jolly-volta-Qzl1D`（或你的主分支）。
3. 触发器的 prompt 填：

   > 运行 GitHub AI 雷达：执行 `python3 scout/crawl.py`，把今日候选用问答卡片发我确认；
   > 我确认后，写入 `scout/data/confirmed-<日期>.json`（含你写的「厉害在哪」分析），
   > 运行 `python3 scout/generate_report.py` 生成报告，commit & push，并把 HTML 发我下载。

4. 到点后会自动开一个会话跑爬虫，并**停在问答卡片等你确认**；你打开 App 点选即可，随后我生成并发你下载。

> 文档：https://code.claude.com/docs/en/claude-code-on-the-web

### 可选：配 GitHub Token 提升限速

无 token 时搜索限 10 次/分钟、core 限 60/小时（够用）。若要更宽裕，在环境变量里加
`GITHUB_TOKEN`（repo 只读即可），`gh.py` 会自动带上。

---

## 调参（`config.json`）

| 键 | 含义 | 默认 |
|---|---|---|
| `rising_window_days` | 「新星」回看多少天内创建 | 45 |
| `min_rising` | 「新星」最低 star | 80 |
| `active_pushed_window_days` | 「热推」最近多少天内有推送 | 4 |
| `min_active` | 「热推」最低 star | 1500 |
| `max_candidates` | 每天最多给你看几个 | 18 |
| `exclude_seen_before_today` | 跨天去重 | true |
| `exclude_awesome_lists` | 过滤 awesome/roadmap 等清单仓库 | true |
| `queries` | 搜索查询列表（topic/排序/赛道，可增删） | 见文件 |

手动调试：
```bash
python3 scout/crawl.py --show-seen    # 不去重，连之前出现过的也显示
python3 scout/crawl.py --no-readme    # 跳过 README，更快
python3 scout/crawl.py --date 2026-05-30
```

## 下载与留存

- 每份报告是**单个自包含 HTML**，可直接双击离线打开、随意分享。
- 报告 commit 进 `scout/reports/`，长期留存；`reports/index.html` 是归档画廊。
- 生成后我会用附件把 HTML 直接发给你下载。
