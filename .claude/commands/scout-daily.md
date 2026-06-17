---
description: Run the GitHub AI 雷达 daily runbook — crawl candidates, confirm picks, write AI analysis, generate the HTML report, archive, and deliver.
argument-hint: "[optional YYYY-MM-DD date override]"
---

You are running the **GitHub AI 雷达 (scout/)** daily runbook. Follow these steps in order.
Output language for the report content is Chinese (matches `scout/config.json` `report_language: zh`).
All dates are **UTC**. If the user passed a date, use `$ARGUMENTS`; otherwise use today (UTC).

## 1. Crawl today's candidates

Run the crawler and read the printed candidate list:

```bash
python3 scout/crawl.py
```

(If a date override was given: `python3 scout/crawl.py --date $ARGUMENTS`.)

This writes `scout/data/candidates-<date>.json`. Read that file — it is the source of
truth for the candidate objects you will reuse verbatim below.

If there are **no candidates**, tell the user and suggest loosening thresholds in
`scout/config.json` or re-running with `--show-seen`. Stop here.

## 2. Ask the user which projects to feature

Present the candidates with the **AskUserQuestion** tool (a multi-select question card),
one option per candidate showing rank, ⭐ stars, language, lane (新星/热推) and a short
description. Let the user pick any subset. Honor "select all" by passing every candidate.

Do **not** invent or add projects that are not in `candidates-<date>.json`.

## 3. Write the confirmed JSON (with your analysis)

For each confirmed project, copy its candidate object **verbatim** from
`candidates-<date>.json`, then add three fields you author from the crawled facts
(stars / language / topics / `readme_excerpt`):

- `category` — a short Chinese category label (e.g. "智能体框架", "推理引擎").
- `why_impressive` — a multi-paragraph Chinese analysis of why it's notable. Supports
  Markdown: **bold**, `code`, `- lists`, `[links]()`.
- `highlights` — an array of 2–4 one-line Chinese highlights.

Base the analysis only on the crawled facts and the README excerpt — **do not fabricate
benchmarks, funding, or features** that aren't supported. Write to
`scout/data/confirmed-<date>.json` in this shape:

```jsonc
{
  "date": "<date>",
  "title": "GitHub AI 雷达 · 每日精选",   // optional
  "intro": "今日看点……",                  // optional opener
  "items": [ { /* candidate object + category + why_impressive + highlights */ } ]
}
```

## 4. Generate the report

```bash
python3 scout/generate_report.py
```

This reads `scout/data/confirmed-<date>.json` and writes self-contained HTML to
`scout/reports/<date>/<owner>__<repo>.html`, then refreshes the archive gallery
`scout/reports/index.html` and `scout/reports/manifest.json`.

## 5. Archive (commit & push)

Commit the new data + reports and push to the current branch (use HTTPS push with retry
on network errors). Keep the commit message in the repo's style, e.g.:

```
feat(scout): <date> 精选 N 篇
```

Stage `scout/data/`, `scout/reports/`, and `scout/data/seen.json`.

## 6. Deliver

Send the generated per-project HTML file(s) and the gallery `scout/reports/index.html`
to the user with **SendUserFile** so they can open/share them offline. Summarize what was
featured (titles + one-line why) in your final message.
