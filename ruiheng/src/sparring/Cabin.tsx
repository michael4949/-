/**
 * 陪练舱（核心）：任务指令条 + AI 数字人对话区（本地剧本引擎按异议类型分支）+ 流程票（五拍闭环计分）
 * 三种模式：教学（三级提示）/ 演练（少量提示）/ 考核（无提示，全程计分）；红线一票否决；语音复诵；回放本场。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import type { Coach } from './coaches';
import {
  MODES, modeById, BEATS, BEAT_DESC, HINT_LEVELS, hintText, ticketItems, ticketMax, checkRed, scoreBeats, beatScore, matchItem, textDeductions,
  pickBranch, nextMood, moodLabel, evaluate, COACH_TIPS, OBJECTION_LABEL, TEAM_DIM_AVG, DIMS, nowLabel, todayLabel, fmtDur,
} from './data';
import type { Mode, Student, SessionResult, Deduction, ItemResult, LineReview, RedRule, Turn, SparScene } from './data';
import type { Timer } from './SparringApp';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
interface CTurn extends Turn { itemId?: string; beats?: boolean[]; ded?: Deduction[]; n?: number; claim?: boolean }
interface ItemState { beats: boolean[]; score: number; covered: boolean; skipped: boolean; hints: number }
interface Props { coach: Coach; coaches: Coach[]; mode: Mode; student: Student; retryItems?: string[]; timer: Timer; onFinish: (r: SessionResult) => void; onRelaunch: (id: string, mode: Mode) => void }

export default function Cabin({ coach, coaches, mode, student, retryItems, timer, onFinish, onRelaunch }: Props) {
  const md = modeById(mode);
  const items = useMemo(() => { const all = ticketItems(coach.stages); return retryItems?.length ? all.filter((i) => retryItems.includes(i.id)) : all; }, [coach, retryItems]);
  const max = useMemo(() => items.reduce((a, i) => a + i.score, 0), [items]);
  const scene: SparScene = useMemo(() => ({ id: coach.id, title: coach.name, category: coach.category, difficulty: coach.difficulty, products: [], role: { name: coach.role.name, title: coach.role.title, traits: coach.role.traits, mood: coach.role.mood, grad: coach.role.grad, initial: coach.role.initial }, goal: coach.goal, opening: coach.opening, replies: coach.replies }), [coach]);

  const [turns, setTurns] = useState<CTurn[]>([{ role: 'ai', text: coach.opening, mood: coach.role.mood, type: 'none' }]);
  const [mood, setMood] = useState(coach.role.mood);
  const [cur, setCur] = useState(0);
  const [st, setSt] = useState<Record<string, ItemState>>({});
  const [ded, setDed] = useState<Deduction[]>([]);
  const [hintShown, setHintShown] = useState<{ item: string; level: number } | null>(null);
  const [veto, setVeto] = useState<{ rule: RedRule; text: string } | null>(null);
  const [vetoed, setVetoed] = useState(false);
  const [reds, setReds] = useState<string[]>([]);
  const [fraud, setFraud] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [replay, setReplay] = useState<{ on: boolean; k: number }>({ on: false, k: 0 });
  const [recite, setRecite] = useState<{ text: string; pct: number; done: boolean } | null>(null);
  const [ended, setEnded] = useState(false);
  const usedRef = useRef<Record<string, number>>({});
  const moodRef = useRef(coach.role.mood);
  const turnsRef = useRef<CTurn[]>(turns);
  const stRef = useRef(st);
  const msgsRef = useRef<HTMLDivElement>(null);
  const curItem = items[cur];
  const authDone = Object.entries(st).some(([id, s]) => s.covered && items.find((i) => i.id === id)?.keywords.includes('授权'));
  const liveRed = useMemo(() => checkRed(input, { authDone, enabled: coach.redlines }), [input, authDone, coach.redlines]);
  const liveHits = curItem ? matchItem(input, curItem) : 0;
  const dedTotal = ded.reduce((a, d) => a + d.points, 0);
  const ticketScore = Object.values(st).reduce((a, s) => a + s.score, 0);
  const coveredCount = Object.values(st).filter((s) => s.covered).length;
  const shown = replay.on ? turns.slice(0, replay.k) : turns;

  useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; }, [shown.length, typing]);
  useEffect(() => { if (!replay.on) return; if (replay.k >= turns.length) { setReplay({ on: false, k: 0 }); return; } const id = setTimeout(() => setReplay((r) => ({ ...r, k: r.k + 1 })), 900); return () => clearTimeout(id); }, [replay, turns.length]);
  useEffect(() => { if (!recite || recite.done) return; const id = setTimeout(() => setRecite((r) => (r ? { ...r, pct: Math.min(100, r.pct + 8), done: r.pct + 8 >= 100 } : r)), 220); return () => clearTimeout(id); }, [recite]);

  const nextUncovered = (from: number, s: Record<string, ItemState>) => { for (let i = from; i < items.length; i++) if (!s[items[i].id]?.covered && !s[items[i].id]?.skipped) return i; for (let i = 0; i < from; i++) if (!s[items[i].id]?.covered && !s[items[i].id]?.skipped) return i; return items.length; };
  const setStates = (s: Record<string, ItemState>) => { stRef.current = s; setSt(s); };
  const pushTurn = (t: CTurn) => { turnsRef.current = [...turnsRef.current, t]; setTurns(turnsRef.current); };

  const send = async (text: string) => {
    const line = text.trim();
    if (!line || typing || ended || replay.on) return;
    if (!timer.running) timer.start();
    const n = turnsRef.current.filter((t) => t.role === 'me').length + 1;
    const dd: Deduction[] = [];
    const red = checkRed(line, { authDone, enabled: coach.redlines });
    if (red.length) { dd.push({ turn: n, kind: 'redline', label: `红线：${red.map((r) => r.label).join('、')}`, points: 20 }); setVetoed(true); setReds((r) => Array.from(new Set([...r, ...red.map((x) => x.label)]))); setVeto({ rule: red[0], text: line }); }
    dd.push(...textDeductions(line, n));
    const prev = turnsRef.current[turnsRef.current.length - 1];
    /* 流程项匹配：优先当前项，其次允许跨项覆盖（命中 ≥ 2 个关键词） */
    let item = curItem && matchItem(line, curItem) >= 1 ? curItem : undefined;
    if (!item) { const cands = items.filter((i) => !stRef.current[i.id]?.covered && !stRef.current[i.id]?.skipped && i.id !== curItem?.id).map((i) => ({ i, h: matchItem(line, i) })).filter((c) => c.h >= 2).sort((a, b) => b.h - a.h); item = cands[0]?.i; }
    const beats = item ? scoreBeats(line, item) : undefined;
    if (prev?.claim && !beats?.[3] && !item) dd.push({ turn: n, kind: 'unverified', label: '客户陈述关键数据后未要求佐证', points: 2 });
    const { branch, reply: bReply } = pickBranch(line, scene, usedRef.current);
    usedRef.current[branch.id] = (usedRef.current[branch.id] ?? 0) + 1;
    const before = moodRef.current;
    let after: number; let reply: string; let claim = false;
    if (item && beats) {
      const ok = beats.filter(Boolean).length;
      after = Math.min(95, Math.max(5, before + (ok >= 3 ? 5 : 1) - red.length * 10));
      reply = ok >= 3 ? item.reply : item.evasive ?? item.reply;
      claim = ok >= 3 && /\d/.test(item.reply);
      const s = { ...stRef.current, [item.id]: { beats, score: beatScore(beats, item.score), covered: true, skipped: false, hints: stRef.current[item.id]?.hints ?? 0 } };
      setStates(s);
      if (coach.fraud && item.id === coach.fraud.itemId && beats[3]) setFraud(true);
      if (item.id === curItem?.id || cur >= items.length) setCur(nextUncovered(cur + 1, s));
    } else {
      after = nextMood(before, branch, line, red.length);
      reply = bReply;
    }
    if (before - after >= 8) dd.push({ turn: n, kind: 'mood', label: `客户情绪下降 ${before - after}`, points: 2 });
    moodRef.current = after;
    if (dd.length) setDed((d) => [...d, ...dd]);
    pushTurn({ role: 'me', text: line, branchId: branch.id, redLines: red.map((r) => r.label), delta: after - before, itemId: item?.id, beats, ded: dd, n });
    setInput(''); setHintShown(null); setTyping(true);
    await sleep(600 + Math.min(700, reply.length * 9));
    pushTurn({ role: 'ai', text: reply, type: item ? 'none' : branch.type, mood: after, branchId: branch.id, delta: after - before, claim });
    setMood(after); setTyping(false);
  };

  const skip = () => {
    if (!curItem || ended) return;
    if (!timer.running) timer.start();
    const s = { ...stRef.current, [curItem.id]: { beats: [false, false, false, false, false], score: 0, covered: false, skipped: true, hints: stRef.current[curItem.id]?.hints ?? 0 } };
    setStates(s); setDed((d) => [...d, { turn: turnsRef.current.filter((t) => t.role === 'me').length, kind: 'skip', label: `跳过「${curItem.name}」`, points: curItem.score }]);
    setCur(nextUncovered(cur + 1, s)); setHintShown(null);
  };
  const hint = () => {
    if (!curItem || ended) return;
    const used = stRef.current[curItem.id]?.hints ?? 0;
    if (used >= md.hintLevels) return;
    const s = { ...stRef.current, [curItem.id]: { ...(stRef.current[curItem.id] ?? { beats: [false, false, false, false, false], score: 0, covered: false, skipped: false, hints: 0 }), hints: used + 1 } };
    setStates(s); setHintShown({ item: curItem.id, level: used });
    if (md.hintCost) setDed((d) => [...d, { turn: turnsRef.current.filter((t) => t.role === 'me').length + 1, kind: 'hint', label: `提示「${curItem.name}」${HINT_LEVELS[used]}`, points: md.hintCost }]);
  };
  const hintsUsed = Object.values(st).reduce((a, s) => a + s.hints, 0);

  const finish = () => {
    if (ended) return;
    setEnded(true);
    const dur = timer.stop();
    const all = turnsRef.current;
    const mine = all.filter((t) => t.role === 'me');
    const report = evaluate(all);
    const w = coach.weights;
    const dimW = report.dims.reduce((a, d, i) => a + d.score * w[i], 0) / w.reduce((a, b) => a + b, 0);
    const tk = Object.values(stRef.current).reduce((a, s) => a + s.score, 0);
    const nonSkip = ded.filter((d) => d.kind !== 'skip').reduce((a, d) => a + d.points, 0);
    const base = mine.length === 0 ? 0 : 0.6 * (tk / Math.max(1, max)) * 100 + 0.4 * dimW;
    const score = Math.round(Math.min(100, Math.max(0, base - nonSkip)));
    const line = mode === 'exam' ? coach.examLine : coach.passLine;
    const redItemMissed = items.some((i) => i.redline && !stRef.current[i.id]?.covered);
    const passed = !vetoed && score >= line && !(mode === 'exam' && redItemMissed);
    const itemRes: ItemResult[] = items.map((i) => { const s = stRef.current[i.id]; return { id: i.id, name: i.name, stage: i.stage, score: s?.score ?? 0, max: i.score, beats: s?.beats ?? [false, false, false, false, false], skipped: !!s?.skipped, covered: !!s?.covered, redline: i.redline }; });
    const reviews: LineReview[] = mine.map((t, k) => {
      const rv = report.reviews[k];
      const it = t.itemId ? items.find((i) => i.id === t.itemId) : undefined;
      const dedNote = t.ded?.length ? `；扣分：${t.ded.map((d) => d.label).join('、')}` : '';
      if (t.redLines?.length) return { original: t.text, comment: rv?.comment ?? '', better: rv?.better ?? '', flag: 'red', item: it?.name };
      if (it && t.beats) { const ok = t.beats.filter(Boolean).length; const miss = BEATS.filter((_, i) => !t.beats![i]); return { original: t.text, comment: `覆盖「${it.name}」· 五拍闭环 ${ok}/5${miss.length ? `，缺：${miss.join('、')}` : ''}${dedNote}`, better: it.script, flag: ok >= 4 ? 'green' : 'gold', item: it.name }; }
      const aiType = all[all.indexOf(t) + 1]?.type ?? 'none';
      return { original: t.text, comment: `${rv?.comment ?? ''} 本句未覆盖任何流程项${dedNote}。`, better: (aiType !== 'none' ? COACH_TIPS[aiType].suggest : '') || rv?.better || '', flag: (t.delta ?? 0) > 0 ? 'green' : 'gold' };
    });
    const skipped = itemRes.filter((i) => i.skipped).length;
    const strengths = [...report.strengths.slice(0, 3), ...(coveredCount === items.length ? ['流程完整覆盖'] : []), ...(hintsUsed === 0 && mode !== 'exam' ? ['未使用提示'] : []), ...(fraud ? ['识别虚假陈述并要求佐证'] : []), ...(itemRes.filter((i) => i.beats.filter(Boolean).length >= 4).length >= 3 ? ['闭环动作扎实'] : [])];
    const improves = [...report.improves.slice(0, 3), ...(skipped ? [`跳过 ${skipped} 项流程`] : []), ...(itemRes.filter((i) => i.covered && !i.beats[1]).length >= 2 ? ['复述确认不足'] : []), ...(itemRes.filter((i) => i.covered && !i.beats[4]).length >= 2 ? ['当场记录习惯待养成'] : []), ...(ded.some((d) => d.kind === 'tone') ? ['命令式语气'] : []), ...(ded.some((d) => d.kind === 'unverified') ? ['关键数据未要求佐证'] : [])];
    const compliance: SessionResult['compliance'] = [...report.compliance.map((c) => ({ label: c.label, tone: c.tone })), ...(mode === 'exam' && redItemMissed ? [{ label: '红线项未完成', tone: 'red' as const }] : []), ...(authDone ? [{ label: '征信授权先行', tone: 'green' as const }] : []), ...(vetoed ? [] : [{ label: '未出具书面承诺', tone: 'green' as const }])];
    const bestBeat = itemRes.filter((i) => i.covered).sort((a, b) => b.score / b.max - a.score / a.max)[0];
    const worst = itemRes.filter((i) => i.covered).sort((a, b) => a.score / a.max - b.score / b.max)[0];
    const summary = `${vetoed ? `本场触发红线「${reds.join('、')}」，判定不通过（一票否决）。` : passed ? `本场达到${mode === 'exam' ? '考核线' : '及格线'} ${line} 分。` : `本场未达${mode === 'exam' ? '考核线' : '及格线'} ${line} 分。`}流程票完成 ${coveredCount}/${items.length} 项（${tk}/${max} 分）${skipped ? `，跳过 ${skipped} 项` : ''}；十维评估加权 ${Math.round(dimW)} 分，扣分合计 ${nonSkip + ded.filter((d) => d.kind === 'skip').reduce((a, d) => a + d.points, 0)} 分，用时 ${fmtDur(dur)}，提示 ${hintsUsed} 次。${bestBeat ? `做得最好的是「${bestBeat.name}」；` : ''}${worst && worst !== bestBeat ? `最需要补强的是「${worst.name}」（${worst.score}/${worst.max}）。` : ''}${fraud ? `在「${items.find((i) => i.id === coach.fraud?.itemId)?.name}」上识别出客户虚假陈述并要求佐证，处置正确。` : coach.fraud && items.some((i) => i.id === coach.fraud!.itemId) ? `提示：客户在「${items.find((i) => i.id === coach.fraud?.itemId)?.name}」上的说法与材料可能不一致（${coach.fraud.claim}），下次记得要求佐证。` : ''}`;
    const retry = itemRes.filter((i) => i.skipped || (i.covered && i.score / i.max < 0.6) || !i.covered).map((i) => i.id);
    const isFull = !retryItems?.length && items.length === ticketItems(coach.stages).length;
    const method = `${retryItems?.length ? '错题重练' : isFull ? '完整流程' : '分段'} · ${coach.name.replace('教练', '')} · ${md.short}`;
    onFinish({
      id: `${coach.id}-${Date.now()}`, coachId: coach.id, coachName: coach.name, mode, date: todayLabel(), score, passLine: coach.passLine, examLine: coach.examLine, passed, vetoed, redlines: reds,
      durationSec: dur, hintsUsed, deductions: ded, deductTotal: ded.reduce((a, d) => a + d.points, 0), dims: report.dims.map((d, i) => ({ dim: d.dim, score: d.score, team: TEAM_DIM_AVG[i] })),
      items: itemRes, ticketScore: tk, ticketMax: max, reviews, strengths: Array.from(new Set(strengths)), improves: Array.from(new Set(improves)), compliance, summary, turns: all, retryItems: retry,
      writeback: { empNo: student.empNo, method, score, taskDone: passed, at: nowLabel() },
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } };
  const myTurns = turns.filter((t) => t.role === 'me').length;
  const curHints = curItem ? st[curItem.id]?.hints ?? 0 : 0;
  const lastAiType = [...turns].reverse().find((t) => t.role === 'ai')?.type ?? 'none';

  return (
    <div className="fade-in">
      <div className="spa-strip">
        <span className="lab">任务指令</span><b>{coach.task}</b>
        <span className="chip"><i />{md.name}</span>
        {retryItems?.length ? <span className="chip"><i />错题重练 · {items.length} 项</span> : null}
        <span style={{ flex: 1, minWidth: 8 }} />
        <span className="chip"><i />流程 {coveredCount}/{items.length}</span>
        <span className="chip"><i />扣分 {dedTotal}</span>
        <span className="chip" style={reds.length ? { background: 'rgba(230,57,70,.35)' } : undefined}><i />红线 {reds.length}</span>
        <select className="spa-inp" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }} value={coach.id} onChange={(e) => onRelaunch(e.target.value, mode)} disabled={myTurns > 0}>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <div className="spa-sw">{MODES.map((m) => <button key={m.id} className={mode === m.id ? `on ${m.tone}` : ''} onClick={() => mode !== m.id && onRelaunch(coach.id, m.id)} title={m.desc}>{m.short}</button>)}</div>
      </div>

      <div className="spa-cabin">
        <div className="card spa-arena">
          <div className="spa-person">
            <div className={`av${typing ? ' talk' : ''}`} style={{ background: coach.role.grad }}>{coach.role.initial}</div>
            <div className="who"><b>{coach.role.name} · {coach.role.title} <span className="card-s" style={{ fontWeight: 600 }}>{coach.role.company}</span></b><span>{coach.role.traits.join(' · ')} · 情绪：{coach.role.emotion} · 目标：{coach.goal}</span></div>
            <div className="spa-mood"><div className="l"><span>客户情绪值</span><span>{mood} · {moodLabel(mood)}</span></div><div className="bar"><i style={{ width: `${mood}%` }} /></div></div>
          </div>

          <div className="spa-msgs" ref={msgsRef}>
            {shown.map((t, i) => (
              <div className={`spa-row ${t.role} fade-in`} key={i}>
                <div className="av" style={t.role === 'ai' ? { background: coach.role.grad } : undefined}>{t.role === 'ai' ? coach.role.initial : student.avatar}</div>
                <div className={`spa-bub ${t.role}${t.redLines?.length ? ' red' : ''}`}>
                  {t.text}
                  {t.role === 'ai' && i > 0 && (
                    <div className="mood"><span>情绪</span><div className="bar"><i style={{ width: `${t.mood ?? 50}%` }} /></div><b className={(t.delta ?? 0) >= 0 ? 'up' : 'down'}>{(t.delta ?? 0) >= 0 ? '+' : ''}{t.delta}</b>{t.type && t.type !== 'none' && <span className="chip orange" style={{ padding: '0 6px', fontSize: 10 }}>{OBJECTION_LABEL[t.type]}异议</span>}{t.claim && <span className="chip blue" style={{ padding: '0 6px', fontSize: 10 }}>关键数据 · 建议核对</span>}</div>
                  )}
                  {t.role === 'me' && (
                    <div className="meta">
                      {t.itemId && <span className="chip green"><i />{items.find((x) => x.id === t.itemId)?.name}</span>}
                      {t.beats && <span className="beats" title={BEATS.map((b, k) => `${b}：${t.beats![k] ? '✓' : '✗'}`).join('\n')}>{t.beats.map((b, k) => <i key={k} className={b ? 'on' : ''}>{k + 1}</i>)}</span>}
                      {!t.itemId && <span className="chip" style={{ padding: '0 6px', fontSize: 10 }}>未覆盖流程项</span>}
                      {t.ded?.map((d, k) => <span key={k} className="chip red" style={{ padding: '0 6px', fontSize: 10 }}>-{d.points} {d.label}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && !replay.on && <div className="spa-row ai"><div className="av" style={{ background: coach.role.grad }}>{coach.role.initial}</div><div className="spa-bub ai spa-typing"><i /><i /><i /></div></div>}
          </div>

          {mode !== 'exam' && lastAiType !== 'none' && !ended && (
            <div className="spa-live" style={{ marginTop: 6 }}><span className="chip orange"><i />识别到{OBJECTION_LABEL[lastAiType]}异议</span><span className="card-s">{COACH_TIPS[lastAiType].detect}</span></div>
          )}

          {recite && (
            <div className="spa-recite">
              <b><Icons.Mic size={12} /> 语音复诵 · {recite.done ? '复诵完成' : '请对照参考话术复诵…'}</b>
              <div className="bar"><i style={{ width: `${recite.pct}%` }} /></div>
              <div>{recite.text}</div>
              {recite.done && <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><span className="chip green"><i />术语读法核对：承兑 chéng duì · 质押 zhì yā · 保理 bǎo lǐ</span><span className="chip"><i />语速 176 字/分 · 填充词 0</span><button className="btn sm gold" onClick={() => { setInput(recite.text); setRecite(null); }}>填入输入框</button><button className="btn sm ghost" onClick={() => setRecite(null)}>关闭</button></div>}
            </div>
          )}

          <div className={`spa-input${liveRed.length ? ' warn' : ''}`}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} disabled={ended || replay.on} placeholder={ended ? '本场已结束，请查看评分复盘' : `以 ${student.name} 的身份回应 ${coach.role.name}…（Enter 发送，Shift+Enter 换行）`} />
            <div className="spa-live">
              {liveRed.length ? liveRed.map((r) => <span key={r.id} className="bad">⚠ 红线：{r.label} — {r.hint}</span>) : <span className="ok">未触发红线</span>}
              {curItem && input.trim() && <span className={liveHits ? 'ok' : 'bad'} style={liveHits ? undefined : { background: 'var(--g-gold-soft)', color: 'var(--gold-3)' }}>{liveHits ? `已命中当前项「${curItem.name}」` : `尚未涉及当前项「${curItem.name}」`}</span>}
            </div>
            <div className="row">
              <span className="hint">第 {myTurns + 1} 轮 · 计时自第一句开始 · 当前项：{curItem ? curItem.name : '流程已全部覆盖，可结束陪练'}</span>
              <button className="btn sm ghost" onClick={() => setRecite({ text: curItem?.script ?? coach.goal, pct: 0, done: false })} disabled={ended || !!recite && !recite.done}><Icons.Mic size={12} />语音复诵</button>
              {replay.on
                ? <button className="btn sm ghost" onClick={() => setReplay({ on: false, k: 0 })}><Icons.Square size={12} />停止回放</button>
                : <button className="btn sm ghost" onClick={() => setReplay({ on: true, k: 1 })} disabled={myTurns === 0 || typing}><Icons.PlayCircle size={12} />回放本场</button>}
              <button className="btn sm gold" onClick={() => void send(input)} disabled={!input.trim() || typing || ended || replay.on}><Icons.Send size={12} />发送</button>
              <button className="btn sm" onClick={finish} disabled={myTurns === 0 || ended || typing}><Icons.Flag size={12} />结束陪练 · 评分复盘</button>
            </div>
          </div>
        </div>

        {/* ---------------- 流程票 ---------------- */}
        <div className="spa-ticket">
          <div className="card">
            <div className="spa-tk-head"><div className="card-t"><span className="dot" />流程票</div><div className="sc num">{ticketScore}<small> / {max} 分</small></div></div>
            <div className="card-s">{coach.stages.length} 段 · {items.length} 项 · 每项按五拍闭环计分{mode === 'exam' ? ' · 考核模式全程计分' : ''}</div>
            {coach.stages.map((s) => { const its = s.items.filter((i) => items.some((x) => x.id === i.id)); if (!its.length) return null; return (
              <div className="spa-tk-stage" key={s.id}>
                <div className="st"><span>{s.name}</span><span>{its.reduce((a, i) => a + (st[i.id]?.score ?? 0), 0)}/{its.reduce((a, i) => a + i.score, 0)}</span></div>
                {its.map((it) => { const idx = items.findIndex((x) => x.id === it.id); const s2 = st[it.id]; const cls = idx === cur ? 'cur' : s2?.skipped ? 'skip' : s2?.covered ? (s2.score / it.score >= 0.6 ? 'done' : 'part') : ''; return (
                  <div key={it.id} className={`spa-tk-item ${cls}`} onClick={() => !ended && setCur(idx)} title="点击设为当前项">
                    <span className="n">{s2?.covered ? '✓' : s2?.skipped ? '×' : idx + 1}</span>
                    <span className="nm">{it.name}{it.redline && <span className="rl">红线项</span>}</span>
                    <span className="pt">{s2 ? s2.score : '—'}/{it.score}</span>
                    {s2?.covered && <span className="beats">{s2.beats.map((b, k) => <i key={k} className={b ? 'on' : ''} />)}</span>}
                  </div>
                ); })}
              </div>
            ); })}
          </div>

          {curItem && !ended && (
            <div className="card">
              <div className="spa-cur">
                <b><Icons.Target size={13} style={{ verticalAlign: -2 }} /> 当前项 · {curItem.name} <span className="card-s">{curItem.stage} · {curItem.score} 分</span></b>
                {mode !== 'exam' && <><div className="pts"><span>要点</span><ul>{curItem.points.map((p) => <li key={p}>{p}</li>)}</ul></div><div className="errs"><span>常见错误</span><ul>{curItem.errors.map((p) => <li key={p}>{p}</li>)}</ul></div></>}
                <div className="spa-five" title={BEAT_DESC.join('\n')}>{BEATS.map((b, k) => <span key={b} className={st[curItem.id]?.beats?.[k] ? 'on' : ''}>{b}</span>)}</div>
              </div>
              <div className="spa-hint">
                <div className="lv">{HINT_LEVELS.map((h, k) => <span key={h} className={k < curHints ? 'used' : ''} style={k >= md.hintLevels ? { opacity: .35 } : undefined}>{h}</span>)}</div>
                {mode === 'exam'
                  ? <div className="none"><Icons.EyeOff size={12} style={{ verticalAlign: -2 }} /> 考核模式无提示，全程计分</div>
                  : hintShown?.item === curItem.id
                    ? <div className="tx"><b>{HINT_LEVELS[hintShown.level]}：</b>{hintText(curItem, hintShown.level)}{hintShown.level === 2 && <div style={{ marginTop: 6 }}><button className="btn sm gold" onClick={() => setInput(hintText(curItem, 2))}>采用参考话术</button></div>}</div>
                    : curHints >= md.hintLevels ? <div className="none">本项提示已用完（{md.hintLevels} 级）</div> : <div className="none">{md.id === 'drill' ? '演练模式仅提供第一级提示，每次扣 1 分' : '可逐级获取方向提示 → 要点提示 → 参考话术'}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="btn sm gold" onClick={hint} disabled={mode === 'exam' || curHints >= md.hintLevels}><Icons.Lightbulb size={12} />{curHints >= md.hintLevels ? '本项提示已用完' : `获取提示（${curHints + 1}/${md.hintLevels}）`}</button>
                  <button className="btn sm ghost" onClick={skip}><Icons.SkipForward size={12} />跳过本项（-{curItem.score}）</button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />实时扣分</div><span className={`chip ${dedTotal ? 'red' : 'green'}`}><i />合计 -{dedTotal}</span></div>
            <div className="spa-ded">
              {ded.length ? ded.slice().reverse().map((d, i) => <div key={i}><span>第 {d.turn} 轮 · {d.label}</span><b>-{d.points}</b></div>) : <div className="empty">尚无扣分 · 保持</div>}
            </div>
            <div className="card-s" style={{ marginTop: 8 }}>十维：{DIMS.slice(0, 5).join(' / ')} …</div>
          </div>
        </div>
      </div>

      {veto && (
        <div className="spa-veto">
          <div className="box">
            <div className="t"><span className="ic"><Icons.OctagonAlert size={22} /></span>红线 · 一票否决</div>
            <p><b>{veto.rule.label}</b>：{veto.rule.hint}</p>
            <div className="q">"{veto.text}"</div>
            <p>本场判定为<b style={{ color: 'var(--red-3)' }}>不通过</b>，扣 20 分并记入合规记录。{mode === 'exam' ? '考核模式下本次结果将回写学习平台。' : '可继续练习完成剩余流程项，评分复盘中将标注本句。'}</p>
            <div className="acts">
              <button className="btn ghost" onClick={() => setVeto(null)}><Icons.RotateCcw size={13} />继续练习（本场不通过）</button>
              <button className="btn" onClick={() => { setVeto(null); finish(); }}><Icons.Flag size={13} />结束并复盘</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
