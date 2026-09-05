import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Area, Bar, CartesianGrid, Cell, ComposedChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as Icons from 'lucide-react';
import { PERSONAS } from '../data/personas';
import { companyById } from '../data/companies';
import {
  BASE_INPUTS, BENCHMARK_IDS, BENCHMARK_NOTE, RATIOS, STATEMENTS, YEARS, checkLedger, cloneInputs, compute, detectAnomalies,
  fmtMoney, fmtRatio, forecastCash, qualityScore, questionsToAsk, ratioById, ratioValue, rowName, stmtById, valuation,
  type Computed, type ForecastMonth, type Inputs, type RatioDef, type Ref, type StmtDef, type StmtId, type Year,
} from '../lib/financials';
import './fin.css';

/* ------------------------------------------------------------------ 小组件 */
const refKey = (r: Ref) => `${r.stmt}.${r.key}.${r.year}`;
const refLabel = (r: Ref) => `${stmtById(r.stmt).short} / ${rowName(r.stmt, r.key)} / ${r.year}`;

function NumCell({ id, value, base, low, hl, onChange }: { id: string; value: number; base: number; low?: boolean; hl?: boolean; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { if (Number(txt.replace(/,/g, '')) !== value) setTxt(String(value)); /* eslint-disable-line */ }, [value]);
  return (
    <input
      id={id}
      className={`cell num${value !== base ? ' edited' : ''}${low ? ' low' : ''}${hl ? ' hl' : ''}`}
      type="text" inputMode="decimal" value={txt}
      title={low ? 'OCR 置信度 < 90%，待人工确认' : value !== base ? `已修改（原值 ${fmtMoney(base)}）` : '点击可编辑，所有指标实时重算'}
      onChange={(e) => { const t = e.target.value; setTxt(t); const n = Number(t.replace(/,/g, '')); if (t.trim() !== '' && Number.isFinite(n)) onChange(n); }}
      onBlur={() => setTxt(String(value))}
    />
  );
}

function StatementTable({ def, inputs, computed, hl, lowCells, onChange }: {
  def: StmtDef; inputs: Inputs; computed: Computed; hl: Set<string>; lowCells: Set<string>;
  onChange: (stmt: StmtId, key: string, year: Year, v: number) => void;
}) {
  return (
    <div className="stmt-wrap">
      <table className="tbl stmt">
        <thead><tr><th>科目（万元）</th>{YEARS.map((y) => <th className="y" key={y}>{y}</th>)}</tr></thead>
        <tbody>
          {def.rows.map((r) => (
            <Fragment key={r.key}>
              {r.section && <tr className="sec"><td colSpan={4}>{r.section}</td></tr>}
              <tr className={r.kind === 'total' ? 'total' : ''}>
                <td className={r.level === 1 ? 'lvl1' : ''}>{r.name}</td>
                {YEARS.map((y) => {
                  const k = `${def.id}.${r.key}.${y}`;
                  const isHl = hl.has(k);
                  return (
                    <td key={y} id={`cell-${def.id}-${r.key}-${y}`} className={`n${isHl && r.kind === 'total' ? ' hl' : ''}`}>
                      {r.kind === 'input'
                        ? <NumCell id={`in-${def.id}-${r.key}-${y}`} value={inputs[def.id][r.key][y]} base={BASE_INPUTS[def.id][r.key][y]} low={lowCells.has(k)} hl={isHl} onChange={(v) => onChange(def.id, r.key, y, v)} />
                        : <span className="num">{fmtMoney(computed[def.id][r.key][y])}</span>}
                    </td>
                  );
                })}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function benchPill(r: RatioDef, v: number | null): { cls: 'good' | 'bad' | 'mid'; text: string } {
  if (v === null || r.bench === null || !Number.isFinite(v)) return { cls: 'mid', text: '—' };
  const tol = r.unit === 'pct' ? 0.01 : r.unit === 'days' ? 3 : 0.05;
  if (Math.abs(v - r.bench) <= tol) return { cls: 'mid', text: '持平' };
  const good = r.better === 'mid' ? Math.abs(v - r.bench) <= tol * 3 : r.better === 'high' ? v > r.bench : v < r.bench;
  return good ? { cls: 'good', text: '优于' } : { cls: 'bad', text: '弱于' };
}

function CashTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ForecastMonth }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card" style={{ padding: '8px 12px', fontSize: 12, minWidth: 180 }}>
      <b>{d.m} · {d.q}</b>
      <div className="kv">
        <div className="row"><span>流入</span><span className="num">{fmtMoney(d.inflow)} 万</span></div>
        <div className="row"><span>流出</span><span className="num">{fmtMoney(d.outflow)} 万</span></div>
        <div className="row"><span>净流量</span><span className={`num${d.net < 0 ? ' red-text' : ' green-text'}`}>{d.net > 0 ? '+' : ''}{fmtMoney(d.net)} 万</span></div>
        <div className="row"><span>月末现金</span><span className="num">{fmtMoney(d.cash)} 万</span></div>
      </div>
      {d.event && <div style={{ marginTop: 6 }}><span className="chip orange"><i />{d.event}</span></div>}
    </div>
  );
}

const REPLAY = [
  { t: 'PDF 扫描件上传', d: '2023–2024 年审计报告 + 2025 年未审报表 · 3 份 / 42 页 · 来自客户经理工作台' },
  { t: 'OCR 识别', d: '识别表格 36 张、字段 412 个；置信度 < 90% 的字段 2 个（黄色标出）· OCR 准确率取决于行内平台' },
  { t: '人工确认', d: '主办客户经理逐项确认低置信度字段 → 数据入库，进入前端复算' },
];
const LOW_CELLS = new Set(['bs.otherRecv.2025', 'bs.notesPay.2025']);
const TILE_IDS = ['grossMargin', 'netMargin', 'roe', 'debtRatio', 'currentRatio', 'quickRatio', 'interestCover', 'arDays', 'invDays', 'apDays', 'cfoToNi', 'cashCollect'];

/* ------------------------------------------------------------------ 页面 */
export default function FinDiagnosis() {
  const wang = PERSONAS[1];
  const co = companyById('ninggui');
  const [inputs, setInputs] = useState<Inputs>(() => cloneInputs(BASE_INPUTS));
  const [replay, setReplay] = useState(0);
  const [ratioOpen, setRatioOpen] = useState<string | null>(null);
  const [hl, setHl] = useState<Set<string>>(new Set());
  const [showMonths, setShowMonths] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const hlTimer = useRef<number | null>(null);

  const computed = useMemo(() => compute(inputs), [inputs]);
  const ledger = useMemo(() => checkLedger(computed), [computed]);
  const anomalies = useMemo(() => detectAnomalies(computed), [computed]);
  const forecast = useMemo(() => forecastCash(computed), [computed]);
  const score = useMemo(() => qualityScore(computed), [computed]);
  const val = useMemo(() => valuation(computed), [computed]);
  const questions = useMemo(() => questionsToAsk(computed, forecast), [computed, forecast]);
  const editedCount = useMemo(() => {
    let n = 0;
    for (const st of STATEMENTS) for (const r of st.rows) if (r.kind === 'input') for (const y of YEARS) if (inputs[st.id][r.key][y] !== BASE_INPUTS[st.id][r.key][y]) n++;
    return n;
  }, [inputs]);
  const ledgerBad = ledger.filter((l) => !l.ok);

  const setValue = useCallback((stmt: StmtId, key: string, year: Year, v: number) => {
    setInputs((prev) => { const next = cloneInputs(prev); next[stmt][key][year] = v; return next; });
  }, []);

  const locate = useCallback((refs: Ref[]) => {
    setHl(new Set(refs.map(refKey)));
    const first = refs[0];
    if (first) document.getElementById(`cell-${first.stmt}-${first.key}-${first.year}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (hlTimer.current) window.clearTimeout(hlTimer.current);
    hlTimer.current = window.setTimeout(() => setHl(new Set()), 3200);
  }, []);

  const lowCells = replay >= 3 ? new Set<string>() : LOW_CELLS;
  const ratio = ratioOpen ? ratioById(ratioOpen) : null;
  const minIdx = forecast.months.findIndex((m) => m.cash === forecast.minCash);

  return (
    <div className="fin-page">
      <div className="page-h">
        <div>
          <h1>财务智能诊断 <span className="gold-text">· {co.name}</span></h1>
          <p>三表解读 · 指标复算 · 红字异常 · 12 个月现金流预测 — 改一个数，全部实时重算</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="chip red"><i />主办 {wang.name} · {wang.title}</span>
          <span className="chip"><i />{co.industry} · {co.district}</span>
          <span className="chip purple"><i />演示回放</span>
          {editedCount > 0 && <button className="btn ghost sm" onClick={() => setInputs(cloneInputs(BASE_INPUTS))}><Icons.RotateCcw size={13} />重置 {editedCount} 处修改</button>}
        </div>
      </div>

      {/* 回放过场 */}
      <div className="card fade-in" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t"><span className="dot" />报表进入系统：扫描件 → OCR → 人工确认</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {replay < 3
              ? <button className="btn sm" onClick={() => setReplay((s) => s + 1)}><Icons.Play size={13} />{['开始回放：上传扫描件', '执行 OCR 识别', '人工确认并入库'][replay]}</button>
              : <><span className="chip green"><i />已确认入库 · 三表可编辑复算</span><button className="btn ghost sm" onClick={() => setReplay(0)}><Icons.RotateCcw size={13} />重新回放</button></>}
          </div>
        </div>
        <div className="replay">
          {REPLAY.map((s, i) => (
            <div key={s.t} className={`rs${replay > i ? ' done' : replay === i ? ' active' : ''}`}>
              <b><span className="idx">{replay > i ? <Icons.Check size={12} /> : i + 1}</span>{s.t}{replay === i && <span className="pulse" />}</b>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="fin-layout">
        {/* 左：三表 */}
        <div className="col">
          <div className="card">
            <div className="card-h">
              <div className="card-t"><span className="dot" />勾稽校验</div>
              <button className="refbtn gold" onClick={() => setShowLedger((v) => !v)}>{showLedger ? '收起' : '展开'} {ledger.length} 项</button>
            </div>
            <div className="ledger">
              {ledgerBad.length === 0
                ? <span className="lc"><Icons.Check size={11} /> 资产 = 负债 + 权益 · 期末现金 = 期初 + 三大净流量 · 净利润推导 — 全部成立</span>
                : ledgerBad.map((l, i) => <span key={i} className="lc bad">{l.year} {l.name}：差 {fmtMoney(l.lhs - l.rhs)}</span>)}
            </div>
            {showLedger && (
              <table className="mini-tbl"><thead><tr><th>勾稽关系</th><th>年份</th><th>左侧</th><th>右侧</th><th>差额</th></tr></thead>
                <tbody>{ledger.map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.year}</td><td>{fmtMoney(l.lhs)}</td><td>{fmtMoney(l.rhs)}</td><td className={l.ok ? '' : 'neg'}>{fmtMoney(l.lhs - l.rhs)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
          {STATEMENTS.map((st) => (
            <div key={st.id} className={`card${st.id === 'bs' ? ' gold' : st.id === 'is' ? '' : ' green'}`}>
              <div className="card-h">
                <div className="card-t"><span className="dot" />{st.name} <span className="card-s">2023–2025 · 万元</span></div>
                {replay < 3 ? <span className="chip orange"><i />OCR 结果待确认</span> : <span className="chip green"><i />可编辑 · 实时重算</span>}
              </div>
              <StatementTable def={st} inputs={inputs} computed={computed} hl={hl} lowCells={lowCells} onChange={setValue} />
            </div>
          ))}
        </div>

        {/* 中：指标与异常 */}
        <div className="col">
          <div className="card red">
            <div className="card-h"><div className="card-t"><span className="dot" />红字异常 <span className="card-s">{anomalies.filter((a) => a.triggered).length} / 3 触发</span></div></div>
            {anomalies.map((a) => (
              <div key={a.id} className={`flag${a.triggered ? '' : ' ok'}`}>
                <div className="fi">{a.triggered ? <Icons.AlertTriangle size={13} /> : <Icons.Check size={13} />}</div>
                <div>
                  <b>{a.title}{!a.triggered && ' · 当前数据下已消除'}</b>
                  <p>{a.detail}</p>
                  <div className="refs">{a.refs.map((r) => <button key={refKey(r)} className="refbtn" onClick={() => locate([r])}><Icons.Crosshair size={10} /> {refLabel(r)}</button>)}</div>
                </div>
              </div>
            ))}
            <div className="ai-tag" style={{ marginTop: 4 }}><Icons.Sparkles size={11} />规则由前端判定 · 解释文字由 AI 生成</div>
          </div>

          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />核心指标 <span className="card-s">2025 · 点击查看公式与口径</span></div></div>
            <div className="ratio-grid">
              {TILE_IDS.map((id) => {
                const r = ratioById(id);
                const v = ratioValue(computed, id, 2025);
                const pill = benchPill(r, v);
                return (
                  <div key={id} className={`ratio-tile${pill.cls === 'bad' ? ' worse' : pill.cls === 'good' ? ' better' : ''}`} onClick={() => setRatioOpen(id)} role="button" tabIndex={0}>
                    <div className="rn"><span>{r.name}</span><span className={`pill ${pill.cls}`}>{pill.text}行业</span></div>
                    <div className="rv num">{fmtRatio(v, r.unit)}</div>
                    <div className="rt num"><s>{fmtRatio(ratioValue(computed, id, 2023), r.unit)}</s><span className="arrow">→</span><s>{fmtRatio(ratioValue(computed, id, 2024), r.unit)}</s><span className="arrow">→</span><span>2025</span></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card purple">
            <div className="card-h"><div className="card-t"><span className="dot" />你该问客户的 5 个问题</div><span className="ai-tag"><Icons.Sparkles size={11} />AI 生成 · 需人工复核</span></div>
            {questions.map((q, i) => (
              <div key={i} className="qa">
                <div className="qn">{i + 1}</div>
                <div>
                  <b>{q.q}</b>
                  <span>目的：{q.why} · </span>
                  {q.refs.map((r) => <button key={refKey(r)} className="refbtn gold" style={{ marginLeft: 4 }} onClick={() => locate([r])}>{refLabel(r)}</button>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右：对标 / 预测 / 评分 */}
        <div className="col col3">
          <div className="card blue">
            <div className="card-h"><div className="card-t"><span className="dot" />同业对标</div><span className="chip blue"><i />行业公开数据估算</span></div>
            <p className="card-s" style={{ marginBottom: 6 }}>{BENCHMARK_NOTE}</p>
            <div className="bench-row" style={{ color: 'var(--ink-3)', fontWeight: 800, borderBottom: '1px solid var(--line)' }}><span>指标</span><span className="bv">宁桂 2025</span><span className="bb">行业中位</span><span /></div>
            {BENCHMARK_IDS.map((id) => {
              const r = ratioById(id); const v = ratioValue(computed, id, 2025); const p = benchPill(r, v);
              return (
                <div key={id} className="bench-row">
                  <span style={{ cursor: 'pointer' }} onClick={() => setRatioOpen(id)}>{r.name}</span>
                  <span className="bv num">{fmtRatio(v, r.unit)}</span>
                  <span className="bb num">{fmtRatio(r.bench, r.unit)}</span>
                  <span className={`pill ${p.cls}`}>{p.text}</span>
                </div>
              );
            })}
          </div>

          <div className="card green">
            <div className="card-h"><div className="card-t"><span className="dot" />未来 12 个月现金流预测</div><span className="card-s">万元 · 单轴</span></div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a86ff" stopOpacity={0.55} /><stop offset="100%" stopColor="#3a86ff" stopOpacity={0.04} /></linearGradient>
                    <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5fd3a0" /><stop offset="100%" stopColor="#1f8a5a" /></linearGradient>
                    <linearGradient id="gNeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e85d55" /><stop offset="100%" stopColor="#8e1b1b" /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8c8478' }} />
                  <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: '#8c8478' }} tickFormatter={(v: number) => fmtMoney(v)} />
                  <Tooltip content={<CashTip />} cursor={{ stroke: 'rgba(201,162,77,.5)', strokeDasharray: '3 3' }} />
                  <ReferenceLine y={0} stroke="#8c8478" strokeWidth={1} />
                  <ReferenceLine y={forecast.safety} stroke="#c9a24d" strokeDasharray="4 4" label={{ value: `安全线 ${forecast.safety}`, position: 'insideTopRight', fontSize: 10, fill: '#9c7a2e' }} />
                  <Area type="monotone" dataKey="cash" name="月末现金" stroke="#3a86ff" strokeWidth={2} fill="url(#gCash)" dot={false} activeDot={{ r: 4 }} />
                  <Bar dataKey="net" name="月度净流量" barSize={12} radius={[4, 4, 0, 0]}>
                    {forecast.months.map((m) => <Cell key={m.m} fill={m.net >= 0 ? 'url(#gPos)' : 'url(#gNeg)'} />)}
                  </Bar>
                  {minIdx >= 0 && <ReferenceDot x={forecast.months[minIdx].m} y={forecast.minCash} r={5} fill="#c3272b" stroke="#fff" strokeWidth={2} label={{ value: `最低 ${fmtMoney(forecast.minCash)}`, position: 'bottom', fontSize: 11, fill: '#8e1b1b', fontWeight: 800 }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend"><span><i style={{ background: 'linear-gradient(#3a86ff,#7fb0ff)' }} />月末现金（面积）</span><span><i style={{ background: 'linear-gradient(#5fd3a0,#1f8a5a)' }} />净流入</span><span><i style={{ background: 'linear-gradient(#e85d55,#8e1b1b)' }} />净流出</span></div>
            <div className="gap-callout">
              <Icons.TrendingDown size={22} color="#c3272b" />
              <div>
                <div className="card-s">{forecast.gapQuarter} · {forecast.minMonth} 月末现金最低 {fmtMoney(forecast.minCash)} 万，低于安全线 {forecast.safety} 万</div>
                <b className="red-text num">资金缺口 ≈ {fmtMoney(forecast.gap)} 万</b>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span className="card-s">假设：{forecast.assumptions.length} 条（随报表编辑重算）</span>
              <button className="refbtn gold" onClick={() => setShowMonths((v) => !v)}>{showMonths ? '收起' : '查看'}月度明细与假设</button>
            </div>
            {showMonths && (
              <>
                <table className="mini-tbl"><thead><tr><th>月</th><th>流入</th><th>流出</th><th>净流量</th><th>月末现金</th></tr></thead>
                  <tbody>{forecast.months.map((m) => <tr key={m.m}><td>{m.m}{m.event ? ` · ${m.event}` : ''}</td><td>{fmtMoney(m.inflow)}</td><td>{fmtMoney(m.outflow)}</td><td className={m.net < 0 ? 'neg' : ''}>{fmtMoney(m.net)}</td><td className={m.cash < forecast.safety ? 'neg' : ''}>{fmtMoney(m.cash)}</td></tr>)}</tbody>
                </table>
                <ul style={{ fontSize: 11, color: 'var(--ink-2)', paddingLeft: 16, marginTop: 8 }}>{forecast.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </>
            )}
          </div>

          <div className="card gold">
            <div className="card-h"><div className="card-t"><span className="dot" />经营质量评分</div><span className="chip"><i />{score.grade}</span></div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="score-ring" style={{ '--p': score.total, '--g-c': score.total >= 60 ? '#1f8a5a' : score.total >= 40 ? '#c9a24d' : '#c3272b' } as React.CSSProperties}><b className="num">{score.total}</b><span>/100</span></div>
              <div style={{ flex: 1 }}>
                {score.dims.map((d) => (
                  <div key={d.name} className="dim" title={d.note}>
                    <span>{d.name}</span>
                    <div className="bar"><i style={{ width: `${d.score}%` }} /></div>
                    <span className="num">{d.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card dark">
            <div className="card-h"><div className="card-t"><span className="dot" />企业价值区间</div><span className="card-s" style={{ color: 'rgba(255,248,232,.7)' }}>内部参考 · 非评估结论</span></div>
            <div className="kv" style={{ fontSize: 12 }}>
              <div className="row" style={{ borderColor: 'rgba(255,255,255,.15)' }}><span>EBITDA（2025，含折旧摊销估算）</span><span className="num">{fmtMoney(val.ebitda)} 万</span></div>
              <div className="row" style={{ borderColor: 'rgba(255,255,255,.15)' }}><span>EV / EBITDA 5–7×</span><span className="num">{(val.evLow / 10000).toFixed(2)} – {(val.evHigh / 10000).toFixed(2)} 亿</span></div>
              <div className="row" style={{ borderColor: 'rgba(255,255,255,.15)' }}><span>EV / Sales 0.35–0.5×</span><span className="num">{(val.evSalesLow / 10000).toFixed(2)} – {(val.evSalesHigh / 10000).toFixed(2)} 亿</span></div>
              <div className="row" style={{ borderColor: 'rgba(255,255,255,.15)' }}><span>净债务（有息负债 − 货币资金）</span><span className="num">{fmtMoney(val.netDebt)} 万</span></div>
            </div>
            <div className="ev-range">
              <i style={{ left: '8%', width: '84%' }} />
              <em style={{ left: '8%', width: `${Math.max(2, (val.equityHigh / Math.max(val.evHigh, val.evSalesHigh)) * 84)}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,248,232,.85)' }}>
              <span>企业价值 {(Math.min(val.evLow, val.evSalesLow) / 10000).toFixed(1)}–{(Math.max(val.evHigh, val.evSalesHigh) / 10000).toFixed(1)} 亿</span>
              <span>股权价值约 {(val.equityLow / 10000).toFixed(1)}–{(val.equityHigh / 10000).toFixed(1)} 亿（绿色部分）</span>
            </div>
            <p style={{ fontSize: 11.5, marginTop: 8, color: 'rgba(255,248,232,.8)' }}>净债务已接近企业价值下限：企业对债务的依赖度高，任何新增授信都应以"改善现金回收"为条件，而非单纯补缺口。</p>
            <div className="ai-tag" style={{ marginTop: 8, background: 'rgba(255,255,255,.15)', color: '#fff8e8' }}><Icons.Sparkles size={11} />倍数区间为行业经验值 · 结论文字由 AI 生成</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <span className="ai-tag" style={{ fontSize: 12, padding: '6px 14px' }}><Icons.ShieldCheck size={13} />指标由前端计算，AI 仅生成解释文字 · 需人工复核</span>
      </div>

      {/* 比率弹层 */}
      {ratio && (
        <div className="overlay" onClick={() => setRatioOpen(null)}>
          <div className="card pop fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="card-h">
              <div className="card-t"><span className="dot" />{ratio.name} <span className="chip" style={{ marginLeft: 6 }}><i />{ratio.group}</span></div>
              <button className="btn ghost sm" onClick={() => setRatioOpen(null)}><Icons.X size={13} />关闭</button>
            </div>
            <div className="sub">公式</div>
            <div className="formula">{ratio.name} = {ratio.formula}</div>
            <div className="sub"><b>口径：</b>{ratio.caliber}</div>
            <div className="year-vals">
              {YEARS.map((y) => <div key={y} className={`yv${y === 2025 ? ' cur' : ''}`}><span>{y}</span><b className="num">{fmtRatio(ratio.calc(computed, y), ratio.unit)}</b></div>)}
            </div>
            {ratio.bench !== null && <div className="sub">行业中位数（公开数据估算）：<b className="num">{fmtRatio(ratio.bench, ratio.unit)}</b> · 2025 年 {benchPill(ratio, ratio.calc(computed, 2025)).text}行业</div>}
            <div className="sub" style={{ marginTop: 10 }}>原表坐标（2025 年；点击定位到左侧报表并高亮）</div>
            {YEARS.slice().reverse().map((y) => (
              <div key={y}>
                {ratio.refs(y).map((r) => (
                  <div key={refKey(r)} className="coord">
                    <span><span className="chip" style={{ marginRight: 6, padding: '1px 7px' }}>{stmtById(r.stmt).short}</span>{rowName(r.stmt, r.key)} · {r.year}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b className="num">{fmtMoney(computed[r.stmt][r.key][r.year])} 万</b><button className="refbtn" onClick={() => { setRatioOpen(null); locate([r]); }}><Icons.Crosshair size={10} /> 定位</button></span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="ai-tag"><Icons.Sparkles size={11} />AI 解释</span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{ratio.name} 三年 {YEARS.map((y) => fmtRatio(ratio.calc(computed, y), ratio.unit)).join(' → ')}；{describeTrend(ratio, computed)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function describeTrend(r: RatioDef, c: Computed): string {
  const a = r.calc(c, 2023), b = r.calc(c, 2025);
  if (a === null || b === null) return '缺少同比基数。';
  const up = b > a;
  const good = r.better === 'mid' ? null : r.better === 'high' ? up : !up;
  const dir = up ? '上升' : '下降';
  if (good === null) return `${dir}，需结合上下游议价能力判断。`;
  return good ? `${dir}属改善方向，但仍需对照行业中位数看绝对水平。` : `${dir}属恶化方向，建议在授信报告财务分析章节说明原因并设置贷后监测阈值。`;
}
