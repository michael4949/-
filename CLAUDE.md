# CLAUDE.md

Guidance for working in this repository. This repo holds **two independent subsystems**
that do not depend on or modify each other.

## 1. AI 爆款工厂 (repo root) — frontend app

Turns a web link (or pasted text) into a vertical Douyin/TikTok short video with Chinese
voiceover + subtitles, **entirely in the browser** (no server, no ffmpeg), powered by
Gemini.

- **Stack:** React 19 + TypeScript + Vite. Entry: `index.html` → `index.tsx` → `App.tsx`.
- **`components/`** — landing-page sections (`HeroSection`, `MethodologySection`, …) and the
  video tool UI under **`components/video/`** (`InputForm`, `ScriptReview`, `StageProgress`,
  `ResultView`).
- **`services/`** — the pipeline:
  - `contentService.ts` — Gemini `urlContext` + `googleSearch` → structured "raw material".
  - `scriptService.ts` — raw material + viral-video methodology → storyboard JSON.
  - `ttsService.ts` — Gemini TTS → 24kHz PCM Chinese voiceover (per shot).
  - `imageService.ts` — optional AI background image per shot (off by default).
  - `subtitles.ts` — split narration into timed subtitles + `.srt`.
  - `videoEngine.ts` — Canvas draw + **WebCodecs → MP4** (`mp4-muxer`), falls back to
    MediaRecorder → WebM.
  - `genai.ts` / `geminiService.ts` — model selection + Gemini client wiring.
- **`types.ts`** — shared types.

### Gemini API key
The app is pure client-side; **there are no server secrets**. The key is provided one of
two ways:
- **In-page:** the user pastes their Gemini key in the UI; it is stored browser-local only.
- **Build-time (local dev):** `GEMINI_API_KEY` from `.env.local` is injected by
  `vite.config.ts` into `process.env.API_KEY` / `process.env.GEMINI_API_KEY`.

Never commit a key. Deployments (Vercel / GitHub Pages) need **no** environment variables.

### Commands
```bash
npm install          # install deps (the SessionStart hook does this on web sessions)
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit (must stay green — CI enforces it)
npm run build        # production build → dist/
```

### Deployment
- **Vercel (recommended):** `vercel.json` present; framework auto-detected as Vite.
- **GitHub Pages:** `.github/workflows/deploy.yml`, **manual** (`workflow_dispatch`) only —
  it is gated manual on purpose so it doesn't clobber the scout report gallery that Pages
  currently serves.

## 2. scout/ — GitHub AI 雷达 (Python)

A daily crawler that finds new + high-star AI repos on GitHub, you confirm which to feature,
then AI writes a "why it's impressive" analysis into a self-contained, offline HTML report
that is archived under `scout/reports/`.

- **Python 3, standard library only** — no `pip install`, no `requirements.txt`.
- `gh.py` — GitHub search + raw README fetch + rate-limit handling. Honors an optional
  `GITHUB_TOKEN` env var for higher limits (read-only repo scope is enough).
- `crawl.py` → `scout/data/candidates-<UTC-date>.json`. Two lanes: `rising` (new + climbing)
  and `active` (high-star + recently pushed). Cross-day de-dup via `data/seen.json`.
- `generate_report.py` — reads `scout/data/confirmed-<date>.json` → per-project HTML in
  `scout/reports/<date>/`, refreshes `scout/reports/index.html` (gallery) + `manifest.json`.
- `config.json` — all thresholds / windows / search queries (tunable).

### Runbook
Use the **`/scout-daily`** slash command — it runs the full crawl → confirm → analyze →
generate → archive → deliver flow. For a daily cadence, point a **Scheduled Trigger**
(Claude Code on the web → Settings → Triggers) at `/scout-daily`. See `scout/README.md`.

```bash
python3 scout/crawl.py               # today's candidates
python3 scout/crawl.py --show-seen   # ignore de-dup
python3 scout/crawl.py --no-readme   # faster (skip README fetch)
python3 scout/generate_report.py     # build report from confirmed-<today>.json
```

## Conventions

- **User-facing content stays Chinese:** UI copy, report content, and **commit messages**
  are written in Chinese (e.g. `feat(scout): <date> 精选 N 篇`). Follow the existing style.
- Keep `npm run typecheck` and `npm run build` green — CI (`.github/workflows/ci.yml`) runs
  both on every PR, plus a byte-compile check of the scout scripts.
- Don't let the two subsystems leak into each other; the scout HTML reports and the frontend
  app are deployed/served separately.

## Automations in this repo

- **`.claude/hooks/session-start.sh`** (+ `.claude/settings.json`) — SessionStart hook:
  `npm install` + python3 check on every web session.
- **`.claude/commands/scout-daily.md`** — the `/scout-daily` runbook command.
- **`.github/workflows/ci.yml`** — PR typecheck + build + scout byte-compile.
- **`.github/workflows/deploy.yml`** — manual GitHub Pages deploy.
