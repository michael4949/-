import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, CartesianGrid, Legend } from 'recharts';
import { PERSONAS } from '../data/personas';
import {
  SCENES, sceneById, pickBranch, checkRedLines, nextMood, moodLabel, COACH_TIPS, OBJECTION_LABEL, KNOWLEDGE, TASKS, WEEK_DONE, TEAM_AVG, DEMO_LINES, evaluate,
} from '../data/sparring';
import type { SparScene, Turn, Report, ObjectionType } from '../data/sparring';
import './sparring.css';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const Stars = ({ n }: { n: number }) => <span className="stars" title={`难度 ${n}/5`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

interface Coach { type: ObjectionType; detect: string; suggest: string }
function openingCoach(scene: SparScene): Coach {
  const { branch, hits } = pickBranch(scene.opening, scene, {});
  if (hits > 0 && branch.type !== 'none') return { type: branch.type, ...COACH_TIPS[branch.type] };
  return { type: 'emotion', detect: '开场：客户带有初始抵触，先建立信任再谈业务', suggest: KNOWLEDGE[0].items[0].text };
}

export default function Sparring() {
  const [sp, setSp] = useSearchParams();
  const scene = useMemo(() => sceneById(sp.get('scene')), [sp]);
  const me = PERSONAS.find((p) => p.id === (scene.id === 'exec' ? 'zhou' : 'lin'))!;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [mood, setMood] = useState(scene.role.mood);
  const [coach, setCoach] = useState<Coach>(() => openingCoach(scene));
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [demo, setDemo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [kbTab, setKbTab] = useState(0);
  const usedRef = useRef<Record<string, number>>({});
  const moodRef = useRef(scene.role.mood);
  const turnsRef = useRef<Turn[]>([]);
  const runRef = useRef(0);
  const msgsRef = useRef<HTMLDivElement>(null);
  const liveRed = useMemo(() => checkRedLines(input), [input]);

  const reset = (s: SparScene) => {
    runRef.current++;
    usedRef.current = {}; moodRef.current = s.role.mood;
    const t: Turn[] = [{ role: 'ai', text: s.opening, mood: s.role.mood, type: 'none' }];
    turnsRef.current = t; setTurns(t); setMood(s.role.mood); setCoach(openingCoach(s));
    setInput(''); setTyping(false); setReport(null); setDemo(false); setPlaying(false);
  };
  useEffect(() => { reset(scene); }, [scene]);
  useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; }, [turns, typing]);

  const send = async (text: string, run = runRef.current) => {
    const line = text.trim();
    if (!line || typing) return;
    const { branch, reply } = pickBranch(line, scene, usedRef.current);
    const red = checkRedLines(line).map((r) => r.label);
    const before = moodRef.current;
    const after = nextMood(before, branch, line, red.length);
    usedRef.current[branch.id] = (usedRef.current[branch.id] ?? 0) + 1;
    moodRef.current = after;
    const mine: Turn = { role: 'me', text: line, branchId: branch.id, redLines: red, delta: after - before };
    turnsRef.current = [...turnsRef.current, mine]; setTurns(turnsRef.current);
    setInput(''); setTyping(true);
    await sleep(650 + Math.min(600, reply.length * 8));
    if (run !== runRef.current) return;
    const ai: Turn = { role: 'ai', text: reply, type: branch.type, mood: after, branchId: branch.id, delta: after - before };
    turnsRef.current = [...turnsRef.current, ai]; setTurns(turnsRef.current);
    setMood(after); setTyping(false);
    setCoach({ type: branch.type, ...COACH_TIPS[branch.type] });
  };

  const playDemo = async () => {
    if (playing) return;
    reset(scene);
    const run = ++runRef.current;
    setPlaying(true); setDemo(true);
    await sleep(500);
    for (const line of DEMO_LINES) {
      if (run !== runRef.current) return;
      setInput(line);
      await sleep(900);
      if (run !== runRef.current) return;
      await send(line, run);
      await sleep(900);
    }
    if (run === runRef.current) setPlaying(false);
  };

  const finish = () => setReport(evaluate(turnsRef.current, demo));
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } };
  const myTurns = turns.filter((t) => t.role === 'me').length;

  return (
    <div className="fade-in">
      <div className="page-h">
        <div>
          <h1><span className="iris-text">智能陪练底座</span> · 真实场景对练与多维评估</h1>
          <p>场景库 → 虚拟客户 → 对话引擎 → 教练提示 → 多维评估 → 话术知识库 · 任务与统计 · 当前受训：{me.name}（{me.title}）</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="chip green"><i />本周已完成 {WEEK_DONE.done}/{WEEK_DONE.total} 场</span>
          <span className="chip purple"><i />场景 {SCENES.length} 个</span>
        </div>
      </div>
      <div className="sp-notice">
        <Icons.ShieldCheck size={16} color="#1f8a5a" />
        <b>银行现场：本机模型 · 无外联；评分只进本人能力画像。</b>
        <span className="card-s">虚拟客户由本地剧本引擎驱动，不上传任何对话内容；主管仅看到汇总统计，不看逐句记录。</span>
      </div>

      <div className="sp-grid">
        {/* ---------------- 左栏：场景库 ---------------- */}
        <div className="card purple">
          <div className="card-h"><div className="card-t"><span className="dot" />场景库</div><span className="card-s">{SCENES.length} 个企金工作场景</span></div>
          <div className="sp-lib">
            {SCENES.map((s) => (
              <button key={s.id} className={`sp-scene${s.id === scene.id ? ' active' : ''}`} onClick={() => setSp({ scene: s.id })}>
                <div className="t"><span>{s.title}</span><Stars n={s.difficulty} /></div>
                <div className="role"><span className="av" style={{ background: s.role.grad }}>{s.role.initial}</span><span>{s.role.title} · {s.role.traits.join(' · ')}</span></div>
                <div className="goal">目标：{s.goal}</div>
                <div className="chips">{s.products.map((p) => <span key={p} className="chip blue">{p}</span>)}<span className="chip">{s.category}</span></div>
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- 中栏：对练舱 / 评估报告 ---------------- */}
        {!report ? (
          <div className="card sp-arena">
            <div className="card-h">
              <div className="card-t"><span className="dot" />对练舱 · {scene.title}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm ghost" onClick={playDemo} disabled={playing}><Icons.PlayCircle size={13} />{playing ? '示范播放中…' : '示范回合（6 轮 · 62 分示范）'}</button>
                <button className="btn sm ghost" onClick={() => reset(scene)}><Icons.RotateCcw size={13} />重开</button>
                <button className="btn sm" onClick={finish} disabled={myTurns === 0 || playing}><Icons.Flag size={13} />结束对练 · 出报告</button>
              </div>
            </div>
            <div className="sp-head">
              <div className="av" style={{ background: scene.role.grad }}>{scene.role.initial}</div>
              <div className="who"><b>{scene.role.name} · {scene.role.title}</b><span>{scene.role.traits.join(' · ')} · 虚拟客户（本地剧本引擎）</span></div>
              <div className="sp-mood">
                <div className="l"><span>客户情绪值</span><span>{mood} · {moodLabel(mood)}</span></div>
                <div className="bar"><i style={{ width: `${mood}%` }} /></div>
              </div>
            </div>

            <div className="sp-coach">
              <div>
                <div className="cap"><Icons.Radar size={11} />识别到的异议</div>
                <span className={`chip ${coach.type === 'none' ? 'green' : coach.type === 'emotion' || coach.type === 'evasion' ? 'red' : 'orange'}`}><i />{OBJECTION_LABEL[coach.type]}</span>
                <div className="card-s" style={{ marginTop: 4, fontSize: 11 }}>{coach.detect}</div>
              </div>
              <div>
                <div className="cap"><Icons.Lightbulb size={11} />推荐话术（点击一键采用）</div>
                <div className="sug"><span>{coach.suggest}</span><button className="btn sm gold" onClick={() => setInput(coach.suggest)}><Icons.Copy size={12} />采用</button></div>
              </div>
              <div>
                <div className="cap"><Icons.ShieldAlert size={11} />合规红线</div>
                {liveRed.length
                  ? <div className="red">{liveRed.map((r) => <div key={r.id}>⚠ {r.label}：{r.hint}</div>)}</div>
                  : <div className="ok">输入未触发红线 · 禁止承诺审批结果 / 贬损同业 / 误导表述</div>}
              </div>
            </div>

            <div className="sp-msgs" ref={msgsRef}>
              {turns.map((t, i) => (
                <div className={`sp-row ${t.role} fade-in`} key={i}>
                  <div className="av" style={t.role === 'ai' ? { background: scene.role.grad } : undefined}>{t.role === 'ai' ? scene.role.initial : me.avatar}</div>
                  <div className={`bub ${t.role}`}>
                    {t.text}
                    {t.role === 'ai' && i > 0 && (
                      <div className="mood">
                        <span>情绪</span><div className="bar"><i style={{ width: `${t.mood ?? 50}%` }} /></div>
                        <b className={(t.delta ?? 0) >= 0 ? 'up' : 'down'}>{(t.delta ?? 0) >= 0 ? '+' : ''}{t.delta}</b>
                        {t.type && t.type !== 'none' && <span className="chip orange" style={{ padding: '0 6px', fontSize: 10 }}>{OBJECTION_LABEL[t.type]}异议</span>}
                      </div>
                    )}
                    {t.role === 'me' && !!t.redLines?.length && <div className="meta">{t.redLines.map((r) => <span key={r} className="chip red"><i />红线：{r}</span>)}</div>}
                  </div>
                </div>
              ))}
              {typing && <div className="sp-row ai"><div className="av" style={{ background: scene.role.grad }}>{scene.role.initial}</div><div className="bub ai sp-typing"><i /><i /><i /></div></div>}
            </div>

            <div className={`sp-input${liveRed.length ? ' warn' : ''}`}>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} placeholder={`以 ${me.name} 的身份回应 ${scene.role.name}…（Enter 发送，Shift+Enter 换行）`} disabled={playing} />
              <div className="bar-row">
                <span className="hint">第 {myTurns + 1} 轮 · 关键词驱动本地剧本 · 异议类型：价格 / 担保 / 额度 / 期限 / 竞品 / 流程 / 回避 / 情绪</span>
                <button className="btn sm ghost" onClick={() => setInput('')}>清空</button>
                <button className="btn sm" onClick={() => void send(input)} disabled={!input.trim() || typing || playing}><Icons.Send size={13} />发送</button>
              </div>
            </div>
          </div>
        ) : (
          <ReportView report={report} scene={scene} onRetry={() => reset(scene)} />
        )}

        {/* ---------------- 右栏：话术知识库 + 任务与统计 ---------------- */}
        <div className="sp-right">
          <div className="card gold">
            <div className="card-h"><div className="card-t"><span className="dot" />话术知识库</div><span className="chip"><i />行方审定</span></div>
            <div className="sp-tabs">{KNOWLEDGE.map((k, i) => <button key={k.cat} className={i === kbTab ? 'active' : ''} onClick={() => setKbTab(i)}>{k.cat}</button>)}</div>
            {KNOWLEDGE[kbTab].items.map((it) => (
              <div className="sp-kb" key={it.title} onClick={() => !report && setInput(it.text)} title="点击填入输入框">
                <b>{it.title}<span>采用 →</span></b><p>{it.text}</p>
              </div>
            ))}
          </div>
          <div className="card green">
            <div className="card-h"><div className="card-t"><span className="dot" />任务与统计</div><span className="card-s">主管下发</span></div>
            {TASKS.map((t) => (
              <div className={`sp-task${t.status === '已完成' ? ' done' : ''}`} key={t.title}>
                <div className="t"><span>{t.title}</span><span className={`chip ${t.status === '已完成' ? 'green' : t.status === '进行中' ? 'orange' : 'purple'}`}>{t.status}</span></div>
                <div className="s">{t.from} · 截止 {t.due} · {t.done}/{t.total}</div>
                <div className="bar"><i style={{ width: `${t.done / t.total * 100}%` }} /></div>
              </div>
            ))}
            <div className="sp-stat">
              <div><div className="card-s">本周完成率</div><b className="green-text">{Math.round(WEEK_DONE.done / WEEK_DONE.total * 100)}%</b></div>
              <div className="bar"><i style={{ width: `${WEEK_DONE.done / WEEK_DONE.total * 100}%` }} /></div>
              <span className="card-s">{WEEK_DONE.done}/{WEEK_DONE.total} 场</span>
            </div>
            <div className="card-s" style={{ fontWeight: 800, marginBottom: 2 }}>团队平均分 vs 本人（按环节）</div>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TEAM_AVG} margin={{ top: 6, right: 4, left: -22, bottom: 0 }} barGap={2}>
                  <defs>
                    <linearGradient id="spBarMe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4b942" /><stop offset="1" stopColor="#e63946" /></linearGradient>
                    <linearGradient id="spBarTeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ae0f0" /><stop offset="1" stopColor="#3a86ff" /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                  <XAxis dataKey="k" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  <Bar dataKey="me" name="本人" fill="url(#spBarMe)" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="team" name="团队均值" fill="url(#spBarTeam)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= 评估报告 ========================= */
function ReportView({ report, scene, onRetry }: { report: Report; scene: SparScene; onRetry: () => void }) {
  const prev = report.history[report.history.length - 2]?.s ?? report.score;
  const diff = report.score - prev;
  return (
    <div className="card fade-in">
      <div className="card-h">
        <div className="card-t"><span className="dot" />评估报告 · {scene.title}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" onClick={onRetry}><Icons.RotateCcw size={13} />再来一局</button>
          <Link className="btn sm gold" to="/scene/profile"><Icons.UserRoundCheck size={13} />写入能力画像</Link>
        </div>
      </div>
      <div className="sp-score">
        <div><div className="card-s">本次得分</div><div className={`big ${report.score >= 70 ? 'green-text' : report.score >= 55 ? 'gold-text' : 'red-text'}`}>{report.score}<small> / 100</small></div></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>较上次 {diff >= 0 ? '+' : ''}{diff} 分 · 虚拟客户：{scene.role.name}（{scene.role.title}）</div>
          <div className="card-s">十维评估由本地规则引擎生成，仅写入本人能力画像；主管仅见汇总。</div>
        </div>
        <span className="ai-tag"><Icons.Sparkles size={12} />AI 评估 · 本机</span>
      </div>

      <div className="sp-r2">
        <div className="sp-sub">
          <div className="card-t">多维评估雷达（10 维）</div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={report.dims} cx="50%" cy="50%" outerRadius="72%">
                <defs>
                  <linearGradient id="spRadar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5da2" stopOpacity={.75} /><stop offset=".5" stopColor="#9b5de5" stopOpacity={.6} /><stop offset="1" stopColor="#3a86ff" stopOpacity={.55} /></linearGradient>
                </defs>
                <PolarGrid stroke="rgba(120,100,60,.22)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#5f5850' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="本次" dataKey="score" stroke="#9b5de5" strokeWidth={2} fill="url(#spRadar)" dot={{ r: 3, fill: '#ff5da2', strokeWidth: 0 }} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div className="sp-sub">
            <div className="card-t">得分与历史对比</div>
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.history} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                  <defs><linearGradient id="spLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#00b4d8" /><stop offset=".5" stopColor="#2dc48d" /><stop offset="1" stopColor="#f4b942" /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                  <XAxis dataKey="d" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Line type="monotone" dataKey="s" name="得分" stroke="url(#spLine)" strokeWidth={3} dot={{ r: 4, fill: '#ff8c42', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="sp-tags">
            <div className="grp"><span className="cap">优势标签</span>{report.strengths.map((s) => <span key={s} className="chip green"><i />{s}</span>)}</div>
            <div className="grp"><span className="cap">待提升</span>{report.improves.map((s) => <span key={s} className="chip orange"><i />{s}</span>)}</div>
            <div className="grp"><span className="cap">合规标签</span>{report.compliance.map((c) => <span key={c.label} className={`chip ${c.tone}`}><i />{c.label}</span>)}</div>
          </div>
        </div>
      </div>

      <div className="sp-sub" style={{ marginTop: 12 }}>
        <div className="card-t">逐句点评（{report.reviews.length} 句）</div>
        {report.reviews.map((r, i) => (
          <div className={`sp-review ${r.flag ?? ''}`} key={i}>
            <div className="q">第 {i + 1} 句 · "{r.original}"</div>
            <div className="c"><b>点评：</b>{r.comment}</div>
            <div className="b"><b>改进话术：</b>{r.better}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <Link className="btn gold" to="/scene/profile"><Icons.UserRoundCheck size={14} />写入能力画像</Link>
        <button className="btn ghost" onClick={onRetry}><Icons.RotateCcw size={14} />换个场景再练</button>
        <span className="card-s" style={{ marginLeft: 'auto' }}>评分只进本人能力画像 · 本机模型 · 无外联</span>
      </div>
    </div>
  );
}
