import { useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { COMPANIES, type Company } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';
import { type ActionModule, type ModuleCtx, hashStr, fmtWan, Sec, AiCard, Field, ChipPick, ChipMulti, Empty } from './shared';

/* ====================================================================== 客户分层与差异化策略（F-KH-013） */
type DimKey = 'deposit' | 'loan' | 'settle' | 'fee' | 'potential';
const DIMS: Array<{ k: DimKey; label: string; unit: string }> = [
  { k: 'deposit', label: '存款日均', unit: '万' }, { k: 'loan', label: '贷款余额', unit: '万' }, { k: 'settle', label: '结算量', unit: '万' }, { k: 'fee', label: '中收', unit: '万' }, { k: 'potential', label: '潜力', unit: '分' },
];
const DEFAULT_W: Record<DimKey, number> = { deposit: 30, loan: 25, settle: 20, fee: 15, potential: 10 };
const TIER_COLORS = ['#c3272b', '#e3a93c', '#1f8a5a', '#3a86ff', '#8c8478'];
const TIER_GRAD = ['linear-gradient(135deg,#ff7a70,#c3272b)', 'linear-gradient(135deg,#f7e2a5,#c9a24d)', 'linear-gradient(135deg,#6ee3ad,#1f8a5a)', 'linear-gradient(135deg,#7fb0ff,#3a86ff)', 'linear-gradient(135deg,#bdb4a6,#8c8478)'];
const RANGES = ['≥ 75', '55 – 74', '35 – 54', '18 – 34', '< 18 或风险信号'];
const THRESH = [75, 55, 35, 18];
const RUN_STAGES = ['读取近 12 个月贡献数据（只读）', '计算五维价值分', '按阈值定层并与上期比较', '生成分层理由与策略建议'];
const FREQ_OPTS = ['每周', '每 2 周', '每 3 周', '每月', '每季度'];
const PRODUCTS = ['集团现金管理', '供应链金融', '跨境金融', '票据池', '投行产品', '代发与收单', '对公理财', '流动资金贷款', '固定资产贷款'];
const PRICING_OPTS = ['分行审批', '支行行长', '客户经理', '标准定价', '不新增授信'];
const MANAGERS = [...PERSONAS.filter((p) => p.customers > 0).map((p) => ({ id: p.id, name: p.name, title: p.title })), { id: 'chen', name: '陈志刚', title: '企金客户经理' }, { id: 'huangl', name: '黄丽华', title: '企金客户经理' }, { id: 'liu', name: '刘沐阳', title: '企金客户经理' }];
interface Strategy { freq: string; products: string[]; pricing: string; owner: string }
const DEFAULT_STRATEGY: Strategy[] = [
  { freq: '每 2 周', products: ['集团现金管理', '供应链金融', '投行产品'], pricing: '分行审批', owner: 'zhou' },
  { freq: '每 3 周', products: ['供应链金融', '票据池', '跨境金融'], pricing: '支行行长', owner: 'wang' },
  { freq: '每月', products: ['流动资金贷款', '代发与收单', '对公理财'], pricing: '客户经理', owner: 'wang' },
  { freq: '每季度', products: ['代发与收单', '对公理财'], pricing: '标准定价', owner: 'lin' },
  { freq: '每周', products: ['风险排查'], pricing: '不新增授信', owner: 'lin' },
];

interface Metrics { deposit: number; loan: number; settle: number; fee: number; potential: number }
const metricsOf = (co: Company): Metrics => { const r = rng(hashStr(co.id) + 5); return { deposit: co.deposit, loan: co.exposure, settle: co.settlement, fee: Math.round((co.settlement * 0.004 + co.exposure * 0.006) * (0.7 + r() * 0.6)), potential: Math.round(40 + r() * 55 + (co.tags.some((t) => /定点|上升|专精|扩建|收汇/.test(t)) ? 10 : 0)) }; };
const tierOfScore = (s: number, co: Company) => { if (co.risk === 'red') return 4; if (co.risk === 'orange' && s < 55) return 4; const i = THRESH.findIndex((t) => s >= t); return i < 0 ? 4 : i; };

function Tiering({ ctx }: { ctx: ModuleCtx }) {
  const { step, tasks, cols, setTasks, select, selected, addLog, toast, setStep } = ctx;
  const [w, setW] = useState<Record<DimKey, number>>(DEFAULT_W);
  const [version, setVersion] = useState('2026 版（分行）');
  const sum = DIMS.reduce((a, d) => a + w[d.k], 0);
  const metrics = useMemo(() => Object.fromEntries(COMPANIES.map((c) => [c.id, metricsOf(c)])) as Record<string, Metrics>, []);
  const maxOf = useMemo(() => Object.fromEntries(DIMS.map((d) => [d.k, Math.max(...COMPANIES.map((c) => metrics[c.id][d.k]))])) as Record<DimKey, number>, [metrics]);
  const results = useMemo(() => COMPANIES.map((co) => {
    const m = metrics[co.id];
    const score = Math.round(DIMS.reduce((a, d) => a + (w[d.k] / Math.max(1, sum)) * (m[d.k] / Math.max(1, maxOf[d.k])) * 100, 0));
    const tier = tierOfScore(score, co);
    const prev = tasks.find((t) => t.coId === co.id)?.col ?? tier;
    const reason = co.risk === 'red' ? '存在红色风险信号，按规则归入观察客户' : score >= 75 ? '存款与结算贡献居前，综合价值分领先' : score >= 55 ? '贷款与结算贡献稳定，潜力分较高' : score >= 35 ? '贡献中等，具备产品渗透空间' : '贡献偏低，以基础服务维护为主';
    return { co, m, score, tier, prev, reason };
  }).sort((a, b) => b.score - a.score), [metrics, maxOf, w, sum, tasks]);

  /* ---- 运行分层 ---- */
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [prog, setProg] = useState(0);
  const timer = useRef<number | null>(null);
  const [applied, setApplied] = useState(false);
  const run = () => {
    setPhase('run'); setProg(0); setApplied(false);
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setProg((p) => { const n = Math.min(100, p + 4 + Math.round(Math.random() * 7)); if (n >= 100) { if (timer.current) window.clearInterval(timer.current); setPhase('done'); } return n; }), 140);
  };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const stageIdx = Math.min(RUN_STAGES.length - 1, Math.floor((prog / 100) * RUN_STAGES.length));
  const changes = results.filter((r) => r.tier !== r.prev);
  const ups = changes.filter((r) => r.tier < r.prev).length; const downs = changes.length - ups;
  const counts = cols.map((c, i) => ({ name: c, v: results.filter((r) => r.tier === i).length, cur: tasks.filter((t) => t.col === i).length }));
  const apply = () => {
    setTasks((ts) => ts.map((t) => { const r = results.find((x) => x.co.id === t.coId); if (!r) return t; const moved = r.tier !== t.col; return { ...t, prevCol: t.col, col: r.tier, score: r.score, synced: false, aiNext: moved ? `${r.tier < t.col ? '升入' : '降为'}${cols[r.tier]}：${r.reason}` : `维持${cols[r.tier]}：${r.reason}`, log: moved ? [...t.log, { at: new Date().toTimeString().slice(0, 5), who: 'AI', text: `分层结果：${cols[t.col]} → ${cols[r.tier]}（价值分 ${r.score}），${r.reason}`, kind: 'ai' as const }] : t.log }; }));
    setApplied(true); toast(`已采用分层结果：${ups} 户升层、${downs} 户降层，看板已更新`);
  };

  /* ---- 策略 ---- */
  const [strat, setStrat] = useState<Strategy[]>(DEFAULT_STRATEGY);
  const upd = (i: number, patch: Partial<Strategy>) => setStrat((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  /* ---- 下发 ---- */
  const [picked, setPicked] = useState<string[]>(['wang', 'zhou', 'lin']);
  const [pushed, setPushed] = useState<string | null>(null);
  const perMgr = (id: string) => tasks.filter((t) => t.owner === id).length;
  const tiersOf = (id: string) => strat.map((s, i) => (s.owner === id ? cols[i] : '')).filter(Boolean);

  if (step === 0) return (
    <>
      <AiCard text={`建议权重：存款日均 30 / 贷款余额 25 / 结算量 20 / 中收 15 / 潜力 10，与分行 ${version} 分层标准一致；权重合计须为 100。`} adopted={JSON.stringify(w) === JSON.stringify(DEFAULT_W)} onAdopt={() => { setW(DEFAULT_W); toast('已采用建议权重'); }} />
      <Field label="分层标准版本"><ChipPick options={['2026 版（分行）', '2025 版（分行）', '总行基准版']} value={version} onChange={setVersion} /></Field>
      <Sec extra={<span className={sum === 100 ? 'green-text' : 'red-text'}>合计 {sum}{sum !== 100 ? '（须为 100）' : ''}</span>}>价值分权重</Sec>
      {DIMS.map((d) => (
        <div key={d.k} className="af-w">
          <span>{d.label}</span>
          <input className="af-range" type="range" min={0} max={60} value={w[d.k]} onChange={(e) => setW((x) => ({ ...x, [d.k]: Number(e.target.value) }))} />
          <b>{w[d.k]}%</b>
        </div>
      ))}
      <Sec>分层阈值</Sec>
      {cols.map((c, i) => <div key={c} className="af-tier"><span className="sw" style={{ background: TIER_GRAD[i] }} /><b>{c}</b><span className="rg">价值分 {RANGES[i]}</span><span className="n">{results.filter((r) => r.tier === i).length} 户</span></div>)}
      <div className="af-row end" style={{ marginTop: 10 }}><button className="btn" disabled={sum !== 100} onClick={() => setStep(1)}><Icons.Play size={13} />保存规则并运行分层</button></div>
    </>
  );

  if (step === 1) return (
    <>
      <AiCard text={`分层引擎将读取 ${COMPANIES.length} 户近 12 个月贡献数据（只读旁路），按 ${version} 阈值定层并与上期结果比较，预计 20 秒内完成。`} />
      <Sec>运行分层</Sec>
      <div className="af-progress"><span>{phase === 'idle' ? '待运行' : phase === 'run' ? '运行中' : '已完成'}</span><div className="bar"><i style={{ width: `${prog}%` }} /></div><b className="num">{prog}%</b></div>
      <div className="af-steps">{RUN_STAGES.map((s, i) => <div key={s} className={`s${phase === 'done' || (phase === 'run' && i < stageIdx) ? ' ok' : phase === 'run' && i === stageIdx ? ' run' : ''}`}><span className="n">{i + 1}</span>{s}</div>)}</div>
      <div className="af-row end" style={{ marginTop: 12 }}>
        {phase !== 'done' && <button className="btn" disabled={phase === 'run'} onClick={run}><Icons.Play size={13} />{phase === 'run' ? '运行中…' : '开始运行'}</button>}
        {phase === 'done' && <><span className="chip green"><i />{changes.length} 户层级变化</span><button className="btn green" onClick={() => setStep(2)}><Icons.ListChecks size={13} />核对分层结果</button></>}
      </div>
    </>
  );

  if (step === 2) return (
    <>
      <AiCard text={`本次 ${ups} 户升层、${downs} 户降层。${changes[0] ? `${changes[0].co.name} 由${cols[changes[0].prev]}${changes[0].tier < changes[0].prev ? '升入' : '降为'}${cols[changes[0].tier]}（${changes[0].reason}）。` : ''}建议逐户核对分层理由后采用，采用后看板按新层级重排。`} adopted={applied} onAdopt={apply} adoptLabel="采用分层结果" />
      <div className="af-grid2">
        <div>
          <Sec>各层数量</Sec>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
                <defs>{TIER_COLORS.map((c, i) => <linearGradient key={c} id={`tierG${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".95" /><stop offset="1" stopColor={c} stopOpacity=".45" /></linearGradient>)}</defs>
                <CartesianGrid stroke="rgba(120,100,60,.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="af-tip"><b>{String(payload[0].payload.name)}</b>本次 {payload[0].payload.v} 户 · 当前看板 {payload[0].payload.cur} 户</div> : null} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]}>{counts.map((_, i) => <Cell key={i} fill={`url(#tierG${i})`} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <Sec extra={`${changes.length} 户`}>升降层变化</Sec>
          {changes.length === 0 && <Empty icon="Equal" title="无层级变化" />}
          {changes.map((r) => <div key={r.co.id} className="af-tier" style={{ cursor: 'pointer' }} onClick={() => select(tasks.find((t) => t.coId === r.co.id)?.id ?? null)}><span className="sw" style={{ background: TIER_GRAD[r.tier] }} /><b style={{ width: 'auto' }}>{r.co.name}</b><span className="rg">{cols[r.prev]} → {cols[r.tier]}</span><span className={`af-move ${r.tier < r.prev ? 'up' : 'down'}`}>{r.tier < r.prev ? <Icons.ArrowUp size={12} /> : <Icons.ArrowDown size={12} />}{r.score} 分</span></div>)}
        </div>
      </div>
      <Sec extra="点击查看看板卡片">分层结果名单</Sec>
      <div className="af-table-wrap">
        <table className="tbl">
          <thead><tr><th>客户</th><th>存款日均</th><th>贷款余额</th><th>结算量</th><th>中收</th><th>潜力</th><th>价值分</th><th>上期</th><th>本次</th><th>分层理由</th></tr></thead>
          <tbody>{results.map((r) => (
            <tr key={r.co.id} style={{ cursor: 'pointer' }} className={selected?.coId === r.co.id ? 'sel' : ''} onClick={() => select(tasks.find((t) => t.coId === r.co.id)?.id ?? null)}>
              <td><b>{r.co.name}</b></td><td className="num">{fmtWan(r.m.deposit)}</td><td className="num">{fmtWan(r.m.loan)}</td><td className="num">{fmtWan(r.m.settle)}</td><td className="num">{fmtWan(r.m.fee)}</td><td className="num">{r.m.potential}</td>
              <td><b className="num">{r.score}</b></td><td className="af-mini">{cols[r.prev]}</td>
              <td><span className="chip" style={{ background: TIER_GRAD[r.tier], color: r.tier === 1 ? '#3a2a08' : '#fff', boxShadow: 'none' }}>{cols[r.tier]}</span>{r.tier !== r.prev && <span className={`af-move ${r.tier < r.prev ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>{r.tier < r.prev ? '↑' : '↓'}</span>}</td>
              <td className="af-mini">{r.reason}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );

  if (step === 3) return (
    <>
      <AiCard text="战略客户建议每 2 周上门、专属定价权限至分行审批、由团队负责人维护；观察客户以风险排查为主，不新增授信、不做主动营销。策略与行内客户分层管理办法一致。" adopted={JSON.stringify(strat) === JSON.stringify(DEFAULT_STRATEGY)} onAdopt={() => { setStrat(DEFAULT_STRATEGY); toast('已采用 AI 策略建议'); }} />
      <Sec>逐层差异化策略</Sec>
      <div className="af-table-wrap">
        <table className="tbl af-strat">
          <thead><tr><th>层级</th><th>客户数</th><th>服务频率</th><th>专属产品</th><th>定价权限</th><th>维护负责人</th></tr></thead>
          <tbody>{cols.map((c, i) => (
            <tr key={c}>
              <td><span className="af-tier" style={{ margin: 0, padding: '4px 8px' }}><span className="sw" style={{ background: TIER_GRAD[i] }} /><b style={{ width: 'auto' }}>{c}</b></span></td>
              <td className="num"><b>{tasks.filter((t) => t.col === i).length}</b></td>
              <td><select className="af-inp sm" value={strat[i].freq} onChange={(e) => upd(i, { freq: e.target.value })}>{FREQ_OPTS.map((o) => <option key={o}>{o}</option>)}</select></td>
              <td><ChipMulti options={i === cols.length - 1 ? ['风险排查', '基础结算'] : PRODUCTS} value={strat[i].products} onChange={(v) => upd(i, { products: v })} /></td>
              <td><select className="af-inp sm" value={strat[i].pricing} onChange={(e) => upd(i, { pricing: e.target.value })}>{PRICING_OPTS.map((o) => <option key={o}>{o}</option>)}</select></td>
              <td><select className="af-inp sm" value={strat[i].owner} onChange={(e) => upd(i, { owner: e.target.value })}>{MANAGERS.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.title}</option>)}</select></td>
            </tr>))}</tbody>
        </table>
      </div>
      <div className="af-row end" style={{ marginTop: 10 }}><button className="btn" onClick={() => { toast('差异化策略已保存为策略卡 v1'); setStep(4); }}><Icons.Save size={13} />保存策略并下发</button></div>
    </>
  );

  return (
    <>
      <AiCard tone="green" text="下发后各客户经理在 OA 与企微收到策略卡（含名下客户层级、服务频率、专属产品与定价权限），建议 3 个工作日内确认接收，周会复盘执行情况。" />
      <Sec extra={`${picked.length}/${MANAGERS.length}`}>选择接收的客户经理</Sec>
      {MANAGERS.map((m) => (
        <div key={m.id} className={`af-mgr${picked.includes(m.id) ? ' on' : ''}`} onClick={() => setPicked((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))}>
          <span className="av">{m.name.slice(0, 1)}</span>
          <div className="bd"><b>{m.name} · {m.title}</b><span>名下 {perMgr(m.id)} 户 · 维护层级：{tiersOf(m.id).join('、') || '按名下客户层级执行'}</span></div>
          {picked.includes(m.id) ? <Icons.CircleCheckBig size={16} color="#1f8a5a" /> : <Icons.Circle size={16} color="#c9a24d" />}
        </div>
      ))}
      <Sec>推送预览</Sec>
      <div className="af-kv">
        {cols.map((c, i) => <div key={c} className="row"><span>{c}（{tasks.filter((t) => t.col === i).length} 户）</span><span>{strat[i].freq} · {strat[i].products.slice(0, 2).join('、')} · 定价 {strat[i].pricing}</span></div>)}
      </div>
      <div className="af-row end" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" onClick={() => toast('策略卡已导出 PDF')}><Icons.Download size={12} />导出策略卡</button>
        <button className="btn green" disabled={!picked.length} onClick={() => { const at = new Date().toTimeString().slice(0, 5); setPushed(at); if (selected) addLog(selected.id, `分层策略已下发至 ${picked.map((p) => MANAGERS.find((m) => m.id === p)?.name).join('、')}`, 'sys'); toast(`已推送策略卡至 ${picked.length} 位客户经理（OA + 企微），待确认接收`); }}><Icons.Send size={13} />推送执行</button>
      </div>
      {pushed && <div className="af-check on" style={{ marginTop: 10, cursor: 'default' }}><span className="bx"><Icons.Check size={11} /></span><div className="bd"><b>已于 {pushed} 推送 {picked.length} 位客户经理</b><span>接收确认：0/{picked.length} · 系统将在 3 个工作日后提醒未确认人员</span></div></div>}
    </>
  );
}

export const TieringModule: ActionModule = { Component: Tiering, wide: (s) => s === 2 || s === 3 };
