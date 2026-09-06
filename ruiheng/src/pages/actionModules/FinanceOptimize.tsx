import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { COMPANIES, companyById } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import DocActions from '../../components/DocActions';
import { type ActionModule, type ModuleCtx, iso, addDays, fmtWan, Sec, AiCard, Field, Check, ChipPick, NumInput, Empty } from './shared';

/* ====================================================================== 投融资方案优化（F-ZY-014） */
type Method = '等额本金' | '等额本息' | '到期一次还本';
const METHODS: Method[] = ['等额本金', '等额本息', '到期一次还本'];
const USES = ['产线扩建', '设备更新', '存量债务置换', '园区 / 厂房建设', '并购整合'];
interface Plan { key: 'A' | 'B' | 'C'; name: string; loan: number; lease: number; bond: number; items: string[]; note: string }
const PLANS: Plan[] = [
  { key: 'A', name: '单一固定资产贷款', loan: 1, lease: 0, bond: 0, items: ['本行固定资产贷款覆盖全部融资需求', '在建工程 / 设备抵押 + 母公司保证', '宽限期内只付息，建设期后等额还本'], note: '结构最简单、审批路径最短，全部占用本行授信额度' },
  { key: 'B', name: '固贷 + 融资租赁组合', loan: 0.7, lease: 0.3, bond: 0, items: ['固定资产贷款 70%，设备部分融资租赁 30%', '设备所有权归租赁公司作增信', '租金与贷款还款错峰安排'], note: '设备部分不占贷款额度，期限与设备寿命匹配' },
  { key: 'C', name: '项目贷款 + 中期票据组合', loan: 0.55, lease: 0, bond: 0.45, items: ['项目贷款 55%，本行主承销中期票据 45%', '票据到期滚动续发，贷款部分等额还本', '资金监管账户 + 应收账款质押'], note: '综合成本最低，需满足发行条件与信息披露' },
];
interface Params { loanRate: number; leaseRate: number; bondCoupon: number; term: number; grace: number; method: Method; fee: number }
const DEFAULT_PARAMS: Params = { loanRate: 4.1, leaseRate: 5.2, bondCoupon: 3.2, term: 8, grace: 1, method: '等额本金', fee: 0.3 };
interface Row { y: string; 项目现金流: number; 还本: number; 付息: number; 还本付息: number; 净现金流: number; dscr: number }
interface Calc { rows: Row[]; totalInterest: number; wacc: number; minDscr: number; payback: number; termFit: boolean }

function calc(plan: Plan, p: Params, need: number, ebitda: number, growth: number): Calc {
  const n = Math.max(1, Math.round(p.term)); const g = Math.max(0, n - p.grace);
  const L = need * plan.loan, Z = need * plan.lease, B = need * plan.bond;
  const r = p.loanRate / 100, rl = p.leaseRate / 100, rb = p.bondCoupon / 100;
  let outL = L, outZ = Z; const rows: Row[] = [];
  const annuityL = g > 0 && r > 0 ? (L * r) / (1 - Math.pow(1 + r, -g)) : L / Math.max(1, g);
  const annuityZ = rl > 0 ? (Z * rl) / (1 - Math.pow(1 + rl, -n)) : Z / n;
  let totalInterest = 0;
  for (let y = 0; y < n; y++) {
    const proj = Math.round(ebitda * Math.pow(1 + growth / 100, y));
    let prinL = 0; const intL = outL * r;
    if (y >= p.grace) {
      if (p.method === '等额本金') prinL = L / Math.max(1, g);
      else if (p.method === '等额本息') prinL = annuityL - intL;
      else prinL = y === n - 1 ? outL : 0;
    }
    prinL = Math.min(prinL, outL); outL -= prinL;
    const intZ = outZ * rl; const prinZ = Z > 0 ? Math.min(outZ, annuityZ - intZ) : 0; outZ -= prinZ;
    const intB = B * rb + (B * (p.fee / 100)); const prinB = y === n - 1 ? B : 0;
    const prin = Math.round(prinL + prinZ + prinB), int = Math.round(intL + intZ + intB);
    totalInterest += int;
    const ds = prin + int;
    rows.push({ y: `第 ${y + 1} 年`, 项目现金流: proj, 还本: prin, 付息: int, 还本付息: ds, 净现金流: proj - ds, dscr: +(proj / Math.max(1, ds)).toFixed(2) });
  }
  const wacc = plan.loan * p.loanRate + plan.lease * p.leaseRate + plan.bond * (p.bondCoupon + p.fee) + (plan.loan ? p.fee / n : 0);
  const avgProj = rows.reduce((a, x) => a + x.项目现金流, 0) / n;
  const payback = +(need / Math.max(1, avgProj)).toFixed(1);
  return { rows, totalInterest: Math.round(totalInterest), wacc: +wacc.toFixed(2), minDscr: Math.min(...rows.map((x) => x.dscr)), payback, termFit: n >= payback + 1 };
}

interface Term { id: string; group: string; text: string; ai: boolean; must?: boolean }
const TERMS: Term[] = [
  { id: 't1', group: '财务契约', text: '资产负债率不高于 65%（按季监测）', ai: true }, { id: 't2', group: '财务契约', text: '偿债覆盖率 DSCR ≥ 1.2', ai: true, must: true }, { id: 't3', group: '财务契约', text: '贷款存续期内限制对外分红（DSCR < 1.3 时）', ai: true }, { id: 't4', group: '财务契约', text: '流动比率不低于 1.1', ai: false },
  { id: 'r1', group: '资金监管', text: '受托支付：单笔超 500 万元由本行直接支付至交易对手', ai: true, must: true }, { id: 'r2', group: '资金监管', text: '项目资金监管账户，回款归集比例 ≥ 60%', ai: true }, { id: 'r3', group: '资金监管', text: '资本金与贷款同比例到位', ai: true },
  { id: 'g1', group: '增信安排', text: '在建工程 / 设备抵押（完工后转固定资产抵押）', ai: true }, { id: 'g2', group: '增信安排', text: '母公司连带责任保证', ai: true }, { id: 'g3', group: '增信安排', text: '项目公司股权质押', ai: false }, { id: 'g4', group: '增信安排', text: '应收账款质押 / 回款监管', ai: false },
  { id: 'x1', group: '触发机制', text: '交叉违约：其他金融机构债务违约触发本行加速到期', ai: true }, { id: 'x2', group: '触发机制', text: '提前还款：允许提前还款，补偿金不高于 1%', ai: false }, { id: 'x3', group: '触发机制', text: '重大事项报告：股权变更、重大诉讼 5 个工作日内报告', ai: true },
];

function FinanceOptimize({ ctx }: { ctx: ModuleCtx }) {
  const { step, setStep, tasks, cols, selected, select, addTask, moveTask, addLog, toast, nav, docs } = ctx;
  const [coId, setCoId] = useState(selected?.coId ?? 'c10');
  const co = companyById(coId);
  const [project, setProject] = useState(`${co.name} ${co.industry === '新能源' ? '光伏组件产线扩建' : '产线扩建'}项目`);
  const [totalInv, setTotalInv] = useState(24000);
  const [equity, setEquity] = useState(30);
  const [need, setNeed] = useState(Math.round(24000 * 0.7));
  const [ebitda, setEbitda] = useState(3600);
  const [growth, setGrowth] = useState(6);
  const [use, setUse] = useState('产线扩建');
  const [p, setP] = useState<Params>(DEFAULT_PARAMS);
  const [pick, setPick] = useState<'A' | 'B' | 'C'>('B');
  const [terms, setTerms] = useState<Record<string, boolean>>(Object.fromEntries(TERMS.map((t) => [t.id, t.ai])));
  const [doc, setDoc] = useState('');
  const [editing, setEditing] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const task = tasks.find((t) => t.id === taskId);
  const results = useMemo(() => PLANS.map((pl) => ({ plan: pl, c: calc(pl, p, need, ebitda, growth) })), [p, need, ebitda, growth]);
  const cur = results.find((r) => r.plan.key === pick) ?? results[0];
  const best = useMemo(() => [...results].sort((a, b) => (a.c.wacc + (a.c.minDscr < 1.2 ? 1 : 0)) - (b.c.wacc + (b.c.minDscr < 1.2 ? 1 : 0)))[0], [results]);
  const upd = (patch: Partial<Params>) => setP((x) => ({ ...x, ...patch }));
  const ensureTask = () => {
    if (task) return task;
    const exist = tasks.find((t) => t.coId === co.id && t.col < cols.length - 1);
    const t = exist ?? addTask({ title: `${co.name} ${use}投融资方案`, coId: co.id, due: iso(addDays(ctx.today, 7)), priority: 'P1', aiNext: '已生成 3 个备选方案，建议进入测算' });
    setTaskId(t.id); select(t.id); return t;
  };
  const genPlans = () => { const t = ensureTask(); moveTask(t.id, 1, `录入需求：${project} · 总投资 ${fmtWan(totalInv)} 万 · 融资 ${fmtWan(need)} 万`); addLog(t.id, `生成 3 个备选方案：${PLANS.map((x) => `${x.key} ${x.name}`).join('、')}`, 'ai'); toast('已生成 3 个备选方案'); setStep(1); };
  const genDoc = () => [
    `${co.name} · ${project} 投融资方案书（推荐方案 ${cur.plan.key}：${cur.plan.name}）`, '',
    '一、需求摘要', `项目总投资 ${fmtWan(totalInv)} 万元，自有资金 ${equity}%（${fmtWan(totalInv - need)} 万元），融资需求 ${fmtWan(need)} 万元，用途：${use}；期限 ${p.term} 年（含宽限期 ${p.grace} 年），首年项目现金流 ${fmtWan(ebitda)} 万元，年增长 ${growth}%。`, '',
    '二、备选方案对比', results.map((r) => `${r.plan.key} ${r.plan.name}：综合成本 ${r.c.wacc.toFixed(2)}%，总付息 ${fmtWan(r.c.totalInterest)} 万元，最低 DSCR ${r.c.minDscr.toFixed(2)}，期限${r.c.termFit ? '匹配' : '偏短'}（回收期约 ${r.c.payback} 年）`).join('\n'), '',
    '三、推荐方案', `${cur.plan.name}：${cur.plan.items.join('；')}。${cur.plan.note}。测算参数：贷款利率 ${p.loanRate}%（LPR 加点）${cur.plan.lease ? `、租赁利率 ${p.leaseRate}%` : ''}${cur.plan.bond ? `、票面利率 ${p.bondCoupon}% + 发行费 ${p.fee}%` : ''}，还款方式 ${p.method}。`, '',
    '四、现金流测算（万元）', cur.c.rows.map((r) => `${r.y}：项目现金流 ${fmtWan(r.项目现金流)}，还本 ${fmtWan(r.还本)}，付息 ${fmtWan(r.付息)}，净现金流 ${fmtWan(r.净现金流)}，DSCR ${r.dscr}`).join('\n'), '',
    '五、风险控制条款', TERMS.filter((t) => terms[t.id]).map((t) => `${t.group} · ${t.text}`).join('\n'), '',
    '六、后续安排', `转授信发起授信方案，同步测算附表；转呈分行公司业务部与授信审批部。本方案书含 AI 生成段落，数字由前端确定性测算，已由客户经理复核。`,
  ].join('\n');
  const docHtml = () => `<pre style="font-family:serif;white-space:pre-wrap">${(doc || genDoc()).replace(/</g, '&lt;')}</pre>`;
  const finalize = () => { setDoc(genDoc()); if (task) { moveTask(task.id, 3, `推荐方案 ${cur.plan.key} ${cur.plan.name}，综合成本 ${cur.c.wacc.toFixed(2)}%`); } setStep(4); };

  if (step === 0) return (
    <>
      <AiCard text={`建议按项目投资计划录入总投资、自有资金与融资缺口：当前自有资金比例 ${equity}%${equity < 20 ? '，低于固定资产投资项目 20% 的资本金要求' : '，满足资本金比例要求'}；融资需求 ${fmtWan(need)} 万元。`} />
      <div className="af-grid2">
        <Field label="客户" req><select className="af-inp" value={coId} onChange={(e) => { setCoId(e.target.value); const c = companyById(e.target.value); setProject(`${c.name} 产线扩建项目`); }}>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.industry}</option>)}</select></Field>
        <Field label="项目名称" req><input className="af-inp" value={project} onChange={(e) => setProject(e.target.value)} /></Field>
      </div>
      <div className="af-grid3">
        <Field label="项目总投资" req><NumInput value={totalInv} onChange={(v) => { setTotalInv(v); setNeed(Math.round(v * (1 - equity / 100))); }} unit="万元" step={500} min={500} /></Field>
        <Field label="自有资金比例" req><NumInput value={equity} onChange={(v) => { setEquity(v); setNeed(Math.round(totalInv * (1 - v / 100))); }} unit="%" step={5} min={0} max={100} /></Field>
        <Field label="融资需求" hint="可手工调整"><NumInput value={need} onChange={setNeed} unit="万元" step={500} min={0} /></Field>
      </div>
      <div className="af-grid3">
        <Field label="期限" req><NumInput value={p.term} onChange={(v) => upd({ term: v })} unit="年" step={1} min={1} max={15} /></Field>
        <Field label="首年项目现金流（EBITDA）" req><NumInput value={ebitda} onChange={setEbitda} unit="万元" step={100} min={0} /></Field>
        <Field label="现金流年增长"><NumInput value={growth} onChange={setGrowth} unit="%" step={1} min={-20} max={50} /></Field>
      </div>
      <Field label="资金用途"><ChipPick options={USES} value={use} onChange={setUse} /></Field>
      <div className="af-row end"><span className="af-mini">{docs.length ? `已关联 ${docs.length} 份项目材料` : '可在上方上传项目可研与现有融资合同'}</span><button className="btn" onClick={genPlans}><Icons.Layers size={13} />生成备选方案</button></div>
    </>
  );

  if (step === 1) return (
    <>
      <AiCard text={`生成 3 个备选方案。${best.plan.key} ${best.plan.name} 综合成本最低（${best.c.wacc.toFixed(2)}%）${best.c.minDscr >= 1.2 ? '且最低 DSCR 满足 1.2' : '，但 DSCR 偏低需调整期限'}；选定方案后进入测算，参数可实时调整。`} adopted={pick === best.plan.key} onAdopt={() => { setPick(best.plan.key); toast(`已采用 AI 推荐：${best.plan.key} ${best.plan.name}`); }} adoptLabel="采用 AI 推荐方案" />
      <div className="af-grid3">
        {results.map(({ plan, c }) => (
          <div key={plan.key} className={`af-plan${pick === plan.key ? ' on' : ''}`} onClick={() => setPick(plan.key)}>
            <div className="h"><span className="k">{plan.key}</span><b>{plan.name}</b>{pick === plan.key && <span className="chip red"><i />已选</span>}</div>
            <ul>{plan.items.map((it) => <li key={it}><Icons.CircleCheckBig size={12} />{it}</li>)}</ul>
            <div className="big">{c.wacc.toFixed(2)}%<small>综合融资成本</small></div>
            <div className="af-row" style={{ marginTop: 6 }}><span className="chip"><i />总付息 {fmtWan(c.totalInterest)} 万</span><span className={`chip ${c.minDscr >= 1.2 ? 'green' : 'red'}`}><i />最低 DSCR {c.minDscr.toFixed(2)}</span><span className={`chip ${c.termFit ? 'green' : 'orange'}`}><i />期限{c.termFit ? '匹配' : '偏短'}</span></div>
            <div className="af-mini" style={{ marginTop: 6 }}>{plan.note}</div>
          </div>
        ))}
      </div>
      <div className="af-row end" style={{ marginTop: 10 }}><button className="btn" onClick={() => { if (task) moveTask(task.id, 2, `选定方案 ${pick}，进入成本与现金流测算`); setStep(2); }}><Icons.Calculator size={13} />测算方案 {pick}</button></div>
    </>
  );

  if (step === 2) return (
    <>
      <AiCard text={`方案 ${cur.plan.key} 综合成本 ${cur.c.wacc.toFixed(2)}%，最低 DSCR ${cur.c.minDscr.toFixed(2)}${cur.c.minDscr < 1.2 ? `，低于 1.2：建议把期限延长至 ${p.term + 2} 年或宽限期增至 ${p.grace + 1} 年` : '，满足偿债覆盖要求'}；回收期约 ${cur.c.payback} 年，期限${cur.c.termFit ? '匹配' : '偏短'}。参数调整后实时重算。`} onAdopt={cur.c.minDscr < 1.2 ? () => { upd({ term: p.term + 2, grace: Math.min(3, p.grace + 1) }); toast('已按建议延长期限与宽限期'); } : undefined} adoptLabel="按建议调整参数" />
      <div className="af-params">
        <Field label="方案"><ChipPick options={['A', 'B', 'C'] as const} value={pick} onChange={setPick} /></Field>
        <Field label="贷款利率（LPR 加点）"><NumInput value={p.loanRate} onChange={(v) => upd({ loanRate: v })} unit="%" step={0.05} min={2} max={10} /></Field>
        <Field label="租赁利率"><NumInput value={p.leaseRate} onChange={(v) => upd({ leaseRate: v })} unit="%" step={0.1} min={2} max={12} /></Field>
        <Field label="票面利率 / 发行费"><div className="af-row"><NumInput value={p.bondCoupon} onChange={(v) => upd({ bondCoupon: v })} unit="%" step={0.05} min={1} max={8} width={110} /><NumInput value={p.fee} onChange={(v) => upd({ fee: v })} unit="%" step={0.05} min={0} max={2} width={100} /></div></Field>
        <Field label="期限"><NumInput value={p.term} onChange={(v) => upd({ term: Math.max(1, Math.min(15, v)) })} unit="年" step={1} min={1} max={15} /></Field>
        <Field label="宽限期"><NumInput value={p.grace} onChange={(v) => upd({ grace: Math.max(0, Math.min(3, v)) })} unit="年" step={1} min={0} max={3} /></Field>
        <Field label="还款方式"><ChipPick options={METHODS} value={p.method} onChange={(v) => upd({ method: v })} tone="blue" /></Field>
        <Field label="首年现金流 / 增长"><div className="af-row"><NumInput value={ebitda} onChange={setEbitda} unit="万" step={100} min={0} width={120} /><NumInput value={growth} onChange={setGrowth} unit="%" step={1} width={90} /></div></Field>
      </div>
      <div className="af-tiles">
        <div className="tile"><b className="num">{cur.c.wacc.toFixed(2)}%</b><span>综合融资成本</span></div>
        <div className="tile"><b className="num">{fmtWan(cur.c.totalInterest)}</b><span>总付息（万元）</span></div>
        <div className="tile"><b className={`num ${cur.c.minDscr >= 1.2 ? 'green-text' : 'red-text'}`}>{cur.c.minDscr.toFixed(2)}</b><span>最低 DSCR（要求 ≥ 1.2）</span></div>
        <div className="tile"><b className={`num ${cur.c.termFit ? 'green-text' : 'red-text'}`}>{cur.c.termFit ? '匹配' : '偏短'}</b><span>期限匹配 · 回收期 {cur.c.payback} 年</span></div>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cur.c.rows} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
            <defs><linearGradient id="foG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3dbb86" /><stop offset="1" stopColor="#1f8a5a" stopOpacity=".6" /></linearGradient><linearGradient id="foG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3a93c" /><stop offset="1" stopColor="#c3272b" stopOpacity=".6" /></linearGradient></defs>
            <CartesianGrid stroke="rgba(120,100,60,.12)" vertical={false} />
            <XAxis dataKey="y" tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="af-tip"><b>{label}</b>{payload.map((x) => <div key={String(x.name)}>{x.name}：{Number(x.value).toLocaleString('zh-CN')} 万</div>)}<div>DSCR：{payload[0].payload.dscr}</div></div> : null} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="项目现金流" fill="url(#foG1)" radius={[5, 5, 0, 0]} /><Bar dataKey="还本付息" fill="url(#foG2)" radius={[5, 5, 0, 0]} />
            <Line type="monotone" dataKey="净现金流" stroke="#3a86ff" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Sec extra="万元 · 前端确定性测算">测算附表</Sec>
      <div className="af-table-wrap">
        <table className="tbl af-cf">
          <thead><tr><th>年度</th><th>项目现金流</th><th>还本</th><th>付息</th><th>还本付息</th><th>净现金流</th><th>DSCR</th></tr></thead>
          <tbody>{cur.c.rows.map((r) => <tr key={r.y}><td>{r.y}</td><td>{fmtWan(r.项目现金流)}</td><td>{fmtWan(r.还本)}</td><td>{fmtWan(r.付息)}</td><td>{fmtWan(r.还本付息)}</td><td className={r.净现金流 < 0 ? 'neg' : ''}>{fmtWan(r.净现金流)}</td><td className={r.dscr < 1.2 ? 'warn' : ''}>{r.dscr.toFixed(2)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="af-row end" style={{ marginTop: 10 }}>
        <button className="btn ghost sm" onClick={() => { const v = `v1.${(saved ? Number(saved.split('.')[1]) + 1 : 0)}`; setSaved(v); if (task) addLog(task.id, `保存测算版本 ${v}：方案 ${pick}，成本 ${cur.c.wacc.toFixed(2)}%，最低 DSCR ${cur.c.minDscr.toFixed(2)}`, 'user'); toast(`测算版本 ${v} 已保存`); }}><Icons.Save size={12} />保存测算版本{saved ? `（${saved}）` : ''}</button>
        <button className="btn" onClick={() => setStep(3)}><Icons.ShieldCheck size={13} />配置风险条款</button>
      </div>
    </>
  );

  if (step === 3) {
    const groups = Array.from(new Set(TERMS.map((t) => t.group)));
    const missing = TERMS.filter((t) => t.must && !terms[t.id]);
    return (
      <>
        <AiCard text={`建议勾选 DSCR ≥ 1.2、受托支付、在建工程抵押三项作为核心条款${cur.c.minDscr < 1.3 ? '；当前最低 DSCR 低于 1.3，建议同时启用分红限制' : ''}。${missing.length ? `必选条款未勾选：${missing.map((t) => t.text.split('：')[0]).join('、')}` : '必选条款已齐备。'}`} adopted={TERMS.every((t) => terms[t.id] === t.ai)} onAdopt={() => { setTerms(Object.fromEntries(TERMS.map((t) => [t.id, t.ai]))); toast('已采用 AI 推荐条款组合'); }} adoptLabel="采用推荐条款" />
        {groups.map((g) => (
          <div key={g}>
            <Sec extra={`${TERMS.filter((t) => t.group === g && terms[t.id]).length}/${TERMS.filter((t) => t.group === g).length}`}>{g}</Sec>
            {TERMS.filter((t) => t.group === g).map((t) => <Check key={t.id} on={!!terms[t.id]} label={t.text} onClick={() => setTerms((x) => ({ ...x, [t.id]: !x[t.id] }))} right={<>{t.must && <span className="chip red"><i />必选</span>}{t.ai && <span className="chip"><i />AI 推荐</span>}</>} />)}
          </div>
        ))}
        <div className="af-row end" style={{ marginTop: 10 }}><button className="btn" disabled={missing.length > 0} onClick={finalize}><Icons.FileText size={13} />生成推荐方案书</button></div>
      </>
    );
  }

  if (step === 4) return (
    <>
      <AiCard text={`推荐方案已定稿：${cur.plan.key} ${cur.plan.name}，综合成本 ${cur.c.wacc.toFixed(2)}%，最低 DSCR ${cur.c.minDscr.toFixed(2)}，${TERMS.filter((t) => terms[t.id]).length} 项风险条款。方案书含方案对比、测算附表与条款清单，可编辑后保存版本、导出或转呈。`} />
      <div className="af-doc-h"><b>{co.name} · {project} 投融资方案书</b><DocActions title={`${co.name}_投融资方案书`} editing={editing} onEdit={() => setEditing((v) => !v)} getHtml={docHtml} onToast={toast} compact /></div>
      {editing ? <textarea className="af-inp doc" value={doc || genDoc()} onChange={(e) => setDoc(e.target.value)} /> : <div className="af-doc-v">{doc || genDoc()}</div>}
      <div className="af-row end" style={{ marginTop: 10 }}><button className="btn ghost sm" onClick={() => { setDoc(genDoc()); toast('已按当前测算重新生成方案书'); }}><Icons.RotateCcw size={12} />重新生成</button><button className="btn" onClick={() => setStep(5)}><Icons.Forward size={13} />转授信 / 转呈</button></div>
    </>
  );

  return (
    <>
      <AiCard tone="green" text="转授信后系统将方案书、测算附表与风险条款同步至授信方案页；转呈时附 AI 参与记录与复核人。建议同时推送 OA 待办给授信审批部。" />
      <Sec>转出摘要</Sec>
      <div className="af-kv">
        <div className="row"><span>客户 / 项目</span><span>{co.name} · {project}</span></div>
        <div className="row"><span>推荐方案</span><span>{cur.plan.key} · {cur.plan.name}</span></div>
        <div className="row"><span>融资需求 / 期限</span><span>{fmtWan(need)} 万元 · {p.term} 年（宽限 {p.grace} 年）</span></div>
        <div className="row"><span>综合成本 / 最低 DSCR</span><span>{cur.c.wacc.toFixed(2)}% · {cur.c.minDscr.toFixed(2)}</span></div>
        <div className="row"><span>风险条款</span><span>{TERMS.filter((t) => terms[t.id]).length} 项（必选 {TERMS.filter((t) => t.must && terms[t.id]).length}/{TERMS.filter((t) => t.must).length}）</span></div>
        <div className="row"><span>经办 / 复核</span><span>{PERSONAS[1].name} / {PERSONAS[2].name}</span></div>
      </div>
      <div className="af-big" style={{ marginTop: 12 }}>
        <button className="b red" onClick={() => { const t = ensureTask(); moveTask(t.id, cols.length - 1, '转授信：发起授信方案'); toast('已转授信，方案书与测算附表已同步'); nav('/f/F-FX-004'); }}><b><Icons.FileCheck2 size={15} />转授信</b><span>发起授信方案与额度测算</span></button>
        <button className="b gold" onClick={() => { const t = ensureTask(); addLog(t.id, '转综合定价测算', 'user'); toast('已转入综合定价测算'); nav('/f/F-YX-008'); }}><b><Icons.Percent size={15} />综合定价测算</b><span>RAROC 与门槛比较</span></button>
        <button className="b green" onClick={() => { const t = ensureTask(); addLog(t.id, '推送 OA 待办至授信审批部', 'sys'); toast('已推送 OA 待办：授信审批部'); }}><b><Icons.Send size={15} />推送 OA 待办</b><span>授信审批部 · 加急</span></button>
      </div>
      <div className="af-row between" style={{ marginTop: 12 }}>
        <DocActions title={`${co.name}_投融资方案书`} getHtml={docHtml} onToast={toast} compact />
        {!task && <Empty icon="Info" title="转出时自动创建看板事项" />}
      </div>
    </>
  );
}

export const FinanceOptimizeModule: ActionModule = { Component: FinanceOptimize, wide: (s) => s >= 1 };
