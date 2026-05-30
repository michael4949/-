import { SubtitleCue } from "../types";

/** 按标点和长度，把一段口播切成适合上屏的短字幕行。 */
export function splitIntoLines(text: string, maxLen = 16): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  // 先按强标点断句
  const parts = clean.split(/(?<=[，。！？、；：,.!?;:])/).map((s) => s.trim()).filter(Boolean);
  const lines: string[] = [];
  let buf = "";
  const flush = () => { if (buf.trim()) lines.push(buf.replace(/[，、；,;]$/, "").trim()); buf = ""; };
  for (const p of parts) {
    if ((buf + p).length <= maxLen) {
      buf += p;
    } else if (p.length <= maxLen) {
      flush();
      buf = p;
    } else {
      // 单段过长，硬切
      flush();
      for (let i = 0; i < p.length; i += maxLen) lines.push(p.slice(i, i + maxLen));
    }
  }
  flush();
  return lines;
}

/** 在一个场景的时间窗内，把字幕行按字数比例分配时间。 */
export function buildSceneCues(narration: string, start: number, end: number): SubtitleCue[] {
  const lines = splitIntoLines(narration);
  if (!lines.length) return [];
  const totalChars = lines.reduce((a, l) => a + l.length, 0) || 1;
  const span = Math.max(0.6, end - start);
  const cues: SubtitleCue[] = [];
  let t = start;
  lines.forEach((line, i) => {
    const frac = line.length / totalChars;
    const dur = i === lines.length - 1 ? end - t : span * frac;
    cues.push({ start: t, end: Math.min(end, t + dur), text: line });
    t += dur;
  });
  return cues;
}

function fmtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

export function toSrt(cues: SubtitleCue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${fmtTime(c.start)} --> ${fmtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}
