import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, Bar, CartesianGrid, Cell, ComposedChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as Icons from 'lucide-react';
import { PERSONAS } from '../data/personas';
import { COMPANIES, companyById } from '../data/companies';
import UploadDocs, { type UDoc } from '../components/UploadDocs';
import DocActions, { exportHtml } from '../components/DocActions';
import AiConclusion from '../components/AiConclusion';
import {
  BENCHMARK_IDS, STATEMENTS, YEARS, checkLedger, cloneInputs, compute, detectAnomalies, fmtMoney, fmtRatio, forecastCash, qualityScore, ratioById, ratioValue, rowName, stmtById, valuation,
  type BenchMap, type Computed, type ForecastMonth, type Inputs, type RatioDef, type Ref, type StmtDef, type StmtId, type Year,
} from '../lib/financials';
import {
  DIAG_STEPS, benchFor, benchNoteFor, diagDetails, factsFor, forecastGrowthFor, genConclusion, genQuestions, inputsFor, minutesTemplate, multiplesFor, presetsFor, recognitionOf, scenarioFor,
  type Recognition,
} from '../lib/financialsGen';
import './fin.css';

/* ------------------------------------------------------------------ 小组件 */
const refKey = (r: Ref) => `${r.stmt}.${r.key}.${r.year}`;
const refLabel = (r: Ref) => `${stmtById(r.stmt).short} / ${rowName(r.stmt, r.key)} / ${r.year}`;
type Phase = 'upload' | 'diagnosing' | 'done';
const DOC_TYPES = ['资产负债表', '利润表', '现金流量表', '审计报告', '纳税申报表'];
const TILE_IDS = ['grossMargin', 'netMargin', 'roe', 'debtRatio', 'currentRatio', 'quickRatio', 'interestCover', 'arDays', 'invDays', 'apDays', 'cfoToNi', 'cashCollect'];

function NumCell({ id, value, base, low, hl, editing, onChange }: { id: string; value: number; base: number; low?: string; hl?: boolean; editing: boolean; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { if (Number(txt.replace(/,/g, '')) !== value) setTxt(String(value)); /* eslint-disable-line */ }, [value]);
  if (!editing) return <span className={`ro-val num${value !== base ? ' edited' : ''}${low ? ' low' : ''}`} title={low ?? (value !== base ? `已修改（原值 ${fmtMoney(base)}）` : undefined)}>{fmtMoney(value)}</span>;
  return (
    <input
      id={id}
      className={`cell num${value !== base ? ' edited' : ''}${low ? ' low' : ''}${hl ? ' hl' : ''}`}
      type="text" inputMode="decimal" value={txt}
      title={low ?? (value !== base ? `已修改（原值 ${fmtMoney(base)}）` : '编辑后所有指标实时重算')}
      onChange={(e) => { const t = e.target.value; setTxt(t); const n = Number(t.replace(/,/g, '')); if (t.trim() !== '' && Number.isFinite(n)) onChange(n); }}
      onBlur={() => setTxt(String(value))}
    />
  );
}

function StatementTable({ def, inputs, base, computed, hl, lowCells, editing, onChange }: {
  def: StmtDef; inputs: Inputs; base: Inputs; computed: Computed; hl: Set<string>; lowCells: Map<string, string>; editing: boolean;
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
                    <td key={y} id={`cell-${def.id}-${r.key}-${y}`} className={`n${isHl && (r.kind === 'total' || !editing) ? ' hl' : ''}`}>
                      {r.kind === 'input'
                        ? <NumCell id={`in-${def.id}-${r.key}-${y}`} value={inputs[def.id][r.key][y]} base={base[def.id][r.key][y]} low={lowCells.get(k)} hl={isHl} editing={editing} onChange={(v) => onChange(def.id, r.key, y, v)} />
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

function benchPill(r: RatioDef, v: number | null, bench: number | undefined): { cls: 'good' | 'bad' | 'mid'; text: string } {
  if (v === null || bench === undefined || !Number.isFinite(v)) return { cls: 'mid', text: '—' };
  const tol = r.unit === 'pct' ? 0.01 : r.unit === 'days' ? 3 : 0.05;
  if (Math.abs(v - bench) <= tol) return { cls: 'mid', text: '持平' };
  const good = r.better === 'mid' ? Math.abs(v - bench) <= tol * 3 : r.better === 'high' ? v > bench : v < bench;
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

function PhaseBar({ phase }: { phase: Phase }) {
  const idx = phase === 'upload' ? 0 : phase === 'diagnosing' ? 1 : 2;
  const items = [
    ['选择客户与上传报表', '多模态识别 → 低置信字段人工确认 → 入库'],
    ['诊断中', '表格重建 → 科目映射 → 勾稽 → 指标 → 对标 → 异常 → 预测 → 追问'],
    ['诊断结果', '三表可编辑复算 · 红字异常 · 预测 · 评分 · 5 个追问'],
  ];
  return (
    <div className="phase-bar">
      {items.map(([t, s], i) => (
        <div key={t} className={`ph${i < idx ? ' done' : i === idx ? ' active' : ''}`}>
          <span className="n">{i < idx ? <Icons.Check size={12} /> : i + 1}</span>
          <div><b>{t}{i === idx && phase === 'diagnosing' && <span className="pulse" style={{ display: 'inline-block', marginLeft: 8 }} />}</b><span>{s}</span></div>
        </div>
      ))}
    </div>
  );
}

function Coverage({ recog }: { recog: Recognition }) {
  const has = (s: StmtId, y: Year) => recog.stmts.some((r) => !r.aux && r.name === stmtById(s).name && r.year === String(y));
  return (
    <div className="cover">
      {STATEMENTS.map((st) => YEARS.map((y) => {
        const ok = has(st.id, y);
        return <span key={`${st.id}${y}`} className={`chip ${ok ? 'green' : ''}`} title={ok ? '来自本次上传' : '本次未上传 · 由行内影像系统历史留存补齐'}><i />{st.short} {y}{ok ? '' : ' · 影像补齐'}</span>;
      }))}
    </div>
  );
}

/* ------------------------------------------------------------------ 页面 */
export default function FinDiagnosis() {
  const nav = useNavigate();
  const [coId, setCoId] = useState('ninggui');
  const co = companyById(coId);
  const owner = PERSONAS.find((p) => p.id === co.owner) ?? PERSONAS[1];
  const [phase, setPhase] = useState<Phase>('upload');
  const [docs, setDocs] = useState<UDoc[]>([]);
  const [upKey, setUpKey] = useState(0);
  const [fieldVals, setFieldVals] = useState<Record<string, string>>({});
  const truth = useMemo(() => inputsFor(co), [co]);
  const recog = useMemo(() => recognitionOf(docs, truth), [docs, truth]);
  const [baseInputs, setBaseInputs] = useState<Inputs>(() => cloneInputs(truth));
  const [inputs, setInputs] = useState<Inputs>(() => cloneInputs(truth));
  const [lowCells, setLowCells] = useState<Map<string, string>>(new Map());
  const [stepIdx, setStepIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [ratioOpen, setRatioOpen] = useState<string | null>(null);
  const [hl, setHl] = useState<Set<string>>(new Set());
  const [showMonths, setShowMonths] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [visitAdded, setVisitAdded] = useState<Set<number>>(new Set());
  const hlTimer = useRef<number | null>(null);

  const bench: BenchMap = useMemo(() => benchFor(co.industry), [co]);
  const computed = useMemo(() => compute(inputs), [inputs]);
  const ledger = useMemo(() => checkLedger(computed), [computed]);
  const anomalies = useMemo(() => detectAnomalies(computed), [computed]);
  const forecast = useMemo(() => forecastCash(computed, forecastGrowthFor(co), scenarioFor(co, computed)), [computed, co]);
  const score = useMemo(() => qualityScore(computed, bench), [computed, bench]);
  const val = useMemo(() => valuation(computed, multiplesFor(co.industry)), [computed, co]);
  const questions = useMemo(() => genQuestions(co, computed, forecast, anomalies, bench), [co, computed, forecast, anomalies, bench]);
  const ledgerBad = ledger.filter((l) => !l.ok);
  const concl = useMemo(() => genConclusion(co, computed, anomalies, forecast, score, val, bench, ledgerBad.length), [co, computed, anomalies, forecast, score, val, bench, ledgerBad.length]);
  const benchStat = useMemo(() => {
    let better = 0, worse = 0;
    for (const id of BENCHMARK_IDS) { const p = benchPill(ratioById(id), ratioValue(computed, id, 2025), bench[id]); if (p.cls === 'good') better++; else if (p.cls === 'bad') worse++; }
    return { better, worse };
  }, [computed, bench]);
  const stepDetails = useMemo(() => diagDetails({ recog, ledgerOk: ledger.length - ledgerBad.length, ledgerTotal: ledger.length, better: benchStat.better, worse: benchStat.worse, industry: co.industry, anomalies, forecast }), [recog, ledger.length, ledgerBad.length, benchStat, co, anomalies, forecast]);
  const editedCount = useMemo(() => {
    let n = 0;
    for (const st of STATEMENTS) for (const r of st.rows) if (r.kind === 'input') for (const y of YEARS) if (inputs[st.id][r.key][y] !== baseInputs[st.id][r.key][y]) n++;
    return n;
  }, [inputs, baseInputs]);
  const sortedAnomalies = useMemo(() => [...anomalies].sort((a, b) => Number(b.triggered) - Number(a.triggered)), [anomalies]);
  const triggered = anomalies.filter((a) => a.triggered).length;
  const allDone = docs.length > 0 && docs.every((d) => d.status === 'done');
  const facts = factsFor(co);

  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (phase !== 'diagnosing') return;
    const t = window.setTimeout(() => { if (stepIdx >= DIAG_STEPS.length) setPhase('done'); else setStepIdx((i) => i + 1); }, stepIdx >= DIAG_STEPS.length ? 350 : 620);
    return () => window.clearTimeout(t);
  }, [phase, stepIdx]);

  const selectCompany = (id: string) => {
    setCoId(id); setPhase('upload'); setDocs([]); setUpKey((k) => k + 1); setFieldVals({}); setLowCells(new Map()); setEditing(false); setHl(new Set()); setVisitAdded(new Set()); setStepIdx(0);
    const next = inputsFor(companyById(id)); setBaseInputs(cloneInputs(next)); setInputs(cloneInputs(next));
  };
  const confirmAndDiagnose = () => {
    const next = cloneInputs(truth); const cells = new Map<string, string>();
    for (const f of recog.fields) {
      const raw = fieldVals[f.id]; const n = raw === undefined || raw.trim() === '' ? f.suggested : Number(raw.replace(/,/g, ''));
      const v = Number.isFinite(n) ? n : f.suggested;
      next[f.ref.stmt][f.ref.key][f.ref.year] = v;
      cells.set(f.id, `低置信字段 · 已人工确认（识别值 ${fmtMoney(f.recognized)} → 确认值 ${fmtMoney(v)}）`);
    }
    setBaseInputs(next); setInputs(cloneInputs(next)); setLowCells(cells); setEditing(false); setVisitAdded(new Set()); setStepIdx(0); setPhase('diagnosing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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
  const addToVisit = (idx: number[]) => {
    setVisitAdded((s) => { const n = new Set(s); idx.forEach((i) => n.add(i)); return n; });
    setToast(`已将 ${idx.length} 个问题加入 ${co.name} 拜访准备包`);
  };
  const minutes = useMemo(() => minutesTemplate(co, owner.name, questions, concl), [co, owner.name, questions, concl]);
  const reportHtml = () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const tiles = TILE_IDS.map((id) => { const r = ratioById(id); return `<tr><td>${r.name}</td>${YEARS.map((y) => `<td>${fmtRatio(ratioValue(computed, id, y), r.unit)}</td>`).join('')}<td>${fmtRatio(bench[id] ?? null, r.unit)}</td></tr>`; }).join('');
    return `<h1>${esc(co.name)} 财务诊断报告</h1><p>${esc(co.industry)} · ${esc(co.district)} · 主办 ${esc(owner.name)} · 2023–2025 三年三表</p>
<h2>AI 结论（置信度 ${Math.round(concl.confidence * 100)}%，需人工复核）</h2><p><b>${esc(concl.headline)}</b></p><ul>${concl.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
<h2>核心指标</h2><table border="1" cellspacing="0" cellpadding="4"><tr><th>指标</th><th>2023</th><th>2024</th><th>2025</th><th>同业中位</th></tr>${tiles}</table>
<h2>红字异常（${triggered} / ${anomalies.length} 触发）</h2><ul>${anomalies.filter((a) => a.triggered).map((a) => `<li><b>${esc(a.title)}</b>：${esc(a.detail)}</li>`).join('') || '<li>无</li>'}</ul>
<h2>12 个月现金流预测</h2><p>最低现金 ${fmtMoney(forecast.minCash)} 万（${forecast.minMonth}），安全线 ${forecast.safety} 万，缺口 ${fmtMoney(forecast.gap)} 万。</p>
<h2>经营质量评分 ${score.total} / 100（${esc(score.grade)}）</h2>
<h2>你该问客户的 5 个问题</h2><ol>${questions.map((q) => `<li>${esc(q.q)}<br/><i>目的：${esc(q.why)}</i></li>`).join('')}</ol>
<p style="color:#888">指标由前端按报表复算，AI 仅生成解释文字 · 需人工复核 · 生成人：${esc(owner.name)}</p>`;
  };

  const ratio = ratioOpen ? ratioById(ratioOpen) : null;
  const minIdx = forecast.months.findIndex((m) => m.cash === forecast.minCash);
  const tagCls: Record<string, string> = { 异常: 'a', 预测: 'f', 行业: 'r', 指标: 'i' };

  return (
    <div className="fin-page">
      <div className="page-h">
        <div>
          <h1>财务智能诊断 <span className="gold-text">· {co.name}</span></h1>
          <p>上传报表 → 多模态识别与确认 → 三表复算 · 红字异常 · 同业对标 · 12 个月现金流预测 · AI 追问 — 改一个数，全部实时重算</p>
        </div>
        <div className="fin-toolbar">
          <label className="co-select" title="选择客户">
            <Icons.Building2 size={14} />
            <select value={coId} onChange={(e) => selectCompany(e.target.value)} aria-label="选择客户">
              {COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.industry}</option>)}
            </select>
            <Icons.ChevronDown size={14} />
          </label>
          <span className="chip red"><i />主办 {owner.name} · {owner.title}</span>
          <span className="chip"><i />{co.industry} · {co.district} · {co.relation}</span>
          <span className="chip purple"><i />AI 引擎 · 行内私有化</span>
        </div>
      </div>

      <PhaseBar phase={phase} />

      {/* ---------------- 阶段一：选择客户与上传报表 ---------------- */}
      {phase === 'upload' && (
        <div className="fin-upload fade-in">
          <div className="col">
            <UploadDocs key={upKey} label={`上传 ${co.name} 财务报表 / 数据文件`} required types={DOC_TYPES} presets={presetsFor(co)}
              hint="支持 Word、Excel、PDF、PPT、图片（扫描件 / 拍照）等多模态文件；识别表格、印章、手写批注，自动映射到标准三表科目"
              onChange={setDocs} />
            <div className="card">
              <div className="card-h"><div className="card-t"><span className="dot" />客户档案 · 诊断前已知信息</div><span className="card-s">来自 CRM / 贷后 / 舆情</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>{co.tags.map((t) => <span key={t} className="chip"><i />{t}</span>)}<span className="chip green"><i />存款 {fmtMoney(co.deposit)} 万</span><span className="chip blue"><i />结算 {fmtMoney(co.settlement)} 万/年</span>{co.exposure > 0 && <span className="chip red"><i />敞口 {fmtMoney(co.exposure)} 万</span>}</div>
              <ul className="facts">{[co.note, ...facts].map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="ai-tag" style={{ marginTop: 8 }}><Icons.Info size={11} />这些信息只用于生成追问与结论的上下文，不参与指标计算</div>
            </div>
          </div>
          <div className="col">
            {recog.docs === 0 ? (
              <div className="card">
                <div className="card-h"><div className="card-t"><span className="dot" />识别结果确认</div><span className="card-s">等待文件识别完成</span></div>
                <div className="wait-box">
                  <div>
                    <div className="ring"><Icons.ScanSearch size={22} /></div>
                    {docs.length ? 'AI 正在识别版面、表格与印章……' : <>上传至少 1 份报表后，这里会列出识别出的报表、年份、页数与置信度，<br />并把低置信字段交给你逐项确认，确认后才开始诊断。</>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card green fade-in">
                <div className="card-h">
                  <div className="card-t"><span className="dot" />识别结果确认</div>
                  <span className="chip green"><i />{recog.docs} 份 · {recog.pages} 页 · 提取 {recog.fieldsTotal} 个字段</span>
                </div>
                <div className="sec-t">识别出的报表</div>
                <table className="mini-tbl rec-tbl">
                  <thead><tr><th>报表</th><th>年份</th><th>来源文件</th><th className="n">页数</th><th className="n">置信度</th></tr></thead>
                  <tbody>{recog.stmts.map((s) => (
                    <tr key={s.id}><td><b>{s.name}</b>{s.aux && <span className="chip" style={{ marginLeft: 6, padding: '0 6px' }}>辅助校验</span>}</td><td>{s.year}</td><td style={{ color: 'var(--ink-3)' }}>{s.doc}</td><td className="n">{s.pages}</td><td className={`n ${s.confidence < 90 ? 'neg' : ''}`}>{s.confidence}%</td></tr>
                  ))}</tbody>
                </table>
                <div className="sec-t">三表覆盖</div>
                <Coverage recog={recog} />
                <div className="sec-t">低置信字段 · {recog.fields.length} 项（识别值 vs 建议值，可编辑后确认）</div>
                {recog.fields.length === 0
                  ? <span className="chip green"><i />本批文件无低置信字段</span>
                  : recog.fields.map((f) => (
                    <div key={f.id} className="lowf">
                      <div className="lf-k"><b>{refLabel(f.ref)}</b><span>{f.doc} · {f.reason}</span></div>
                      <div className="lf-v"><span className="lab">识别值</span><s className="num">{fmtMoney(f.recognized)}</s></div>
                      <div className="lf-v"><span className="lab">建议值</span><b className="num green-text">{fmtMoney(f.suggested)}</b></div>
                      <div className="lf-v"><span className="lab">确认值</span><input className="cell num" value={fieldVals[f.id] ?? String(f.suggested)} onChange={(e) => setFieldVals((p) => ({ ...p, [f.id]: e.target.value }))} /></div>
                      <button className="refbtn" onClick={() => setFieldVals((p) => ({ ...p, [f.id]: String(f.recognized) }))}>采用识别值</button>
                    </div>
                  ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <span className="ai-tag"><Icons.Sparkles size={11} />建议值由跨表勾稽与合计校验推算 · 需人工确认</span>
                  <button className="btn" disabled={!allDone} onClick={confirmAndDiagnose}><Icons.DatabaseZap size={14} />{allDone ? '确认入库并开始诊断' : '等待全部文件识别完成…'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- 阶段二：诊断中 ---------------- */}
      {phase === 'diagnosing' && (
        <div className="grid g2 fade-in">
          <div className="card gold">
            <div className="card-h"><div className="card-t"><span className="dot" />AI 诊断思考流</div><span className="ai-tag"><span className="pulse" />本机模型 · 无外联</span></div>
            <div className="think think-live">
              {DIAG_STEPS.map((s, i) => {
                const state = stepIdx > i ? 'done' : stepIdx === i ? 'running' : 'pending';
                return (
                  <div key={s} className={`step ${state}`}>
                    <div className="n">{state === 'done' ? <Icons.Check size={12} /> : i + 1}</div>
                    <div><b>{s}{state === 'running' && <span className="pulse" style={{ display: 'inline-block', marginLeft: 8 }} />}</b>{state !== 'pending' && <p>{stepDetails[i]}</p>}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />本次入库数据</div><span className="chip green"><i />已确认 {lowCells.size} 个低置信字段</span></div>
            <div className="kv">
              <div className="row"><span>客户</span><span>{co.name} · {co.industry}</span></div>
              <div className="row"><span>来源文件</span><span>{recog.docs} 份 · {recog.pages} 页</span></div>
              <div className="row"><span>识别报表</span><span>{recog.stmts.filter((s) => !s.aux).length} 张 · 覆盖 {recog.years.join(' / ')}</span></div>
              <div className="row"><span>提取字段</span><span>{recog.fieldsTotal} 个</span></div>
              <div className="row"><span>数据处理</span><span>脱敏后进入本次任务上下文，不留存原件</span></div>
            </div>
            <div className="ai-tag" style={{ marginTop: 10 }}><Icons.ShieldCheck size={11} />指标由前端计算，AI 仅生成解释文字</div>
          </div>
        </div>
      )}

      {/* ---------------- 阶段三：诊断结果 ---------------- */}
      {phase === 'done' && (
        <div className="fade-in">
          <AiConclusion headline={concl.headline} points={concl.points} evidence={concl.evidence} confidence={concl.confidence} tone={concl.tone} actions={['credit', 'report', 'visit']} onSystem={(_, label) => setToast(`已执行：${label}`)} />
          <div className="card docbar">
            <div className="card-t"><span className="dot" />{co.name} 财务诊断报告</div>
            <span className="card-s">{recog.docs} 份来源文件 · {lowCells.size} 个字段人工确认 · {editedCount > 0 ? `${editedCount} 处手工修改` : '无手工修改'}</span>
            <div className="sp" />
            <DocActions title={`${co.name}财务诊断报告`} editing={editing} onEdit={() => setEditing((v) => !v)} getHtml={reportHtml} onToast={setToast} />
            {editedCount > 0 && <button className="btn ghost sm" onClick={() => setInputs(cloneInputs(baseInputs))}><Icons.RotateCcw size={13} />重置 {editedCount} 处修改</button>}
            <button className="btn ghost sm" onClick={() => selectCompany(coId)}><Icons.Upload size={13} />重新上传 / 更换客户</button>
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
                    {editing ? <span className="chip orange"><i />编辑中 · 实时重算</span> : <span className="chip green"><i />已确认入库 · 点「编辑」可修改</span>}
                  </div>
                  <StatementTable def={st} inputs={inputs} base={baseInputs} computed={computed} hl={hl} lowCells={lowCells} editing={editing} onChange={setValue} />
                </div>
              ))}
            </div>

            {/* 中：异常 / 指标 / 追问 */}
            <div className="col">
              <div className={`card${triggered ? ' red' : ' green'}`}>
                <div className="card-h"><div className="card-t"><span className="dot" />红字异常 <span className="card-s">{triggered} / {anomalies.length} 触发</span></div></div>
                {sortedAnomalies.map((a) => (
                  <div key={a.id} className={`flag${a.triggered ? '' : ' ok'}`}>
                    <div className="fi">{a.triggered ? <Icons.AlertTriangle size={13} /> : <Icons.Check size={13} />}</div>
                    <div>
                      <b>{a.title}{!a.triggered && ' · 未触发'}</b>
                      {a.triggered && <p>{a.detail}</p>}
                      {a.triggered && <div className="refs">{a.refs.map((r) => <button key={refKey(r)} className="refbtn" onClick={() => locate([r])}><Icons.Crosshair size={10} /> {refLabel(r)}</button>)}</div>}
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
                    const pill = benchPill(r, v, bench[id]);
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
                <div className="card-h"><div className="card-t"><span className="dot" />你该问客户的 5 个问题</div><span className="ai-tag"><Icons.Sparkles size={11} />AI 按 {triggered} 条异常 + {co.industry}要点生成</span></div>
                {questions.map((q, i) => (
                  <div key={i} className={`qa${visitAdded.has(i) ? ' added' : ''}`}>
                    <div className="qn">{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <b><span className={`qtag ${tagCls[q.tag]}`}>{q.tag}</span>{q.q}</b>
                      <span>目的：{q.why} · </span>
                      {q.refs.map((r) => <button key={refKey(r)} className="refbtn gold" style={{ marginLeft: 4 }} onClick={() => locate([r])}>{refLabel(r)}</button>)}
                      <div className="qact">
                        {visitAdded.has(i)
                          ? <span className="chip green"><i />已加入拜访准备</span>
                          : <button className="refbtn" onClick={() => addToVisit([i])}><Icons.CalendarPlus size={10} /> 加入拜访准备</button>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="q-foot">
                  <button className="btn sm" onClick={() => { const rest = questions.map((_, i) => i).filter((i) => !visitAdded.has(i)); if (rest.length) addToVisit(rest); else nav('/f/F-KH-002'); }}><Icons.CalendarPlus size={13} />{visitAdded.size === questions.length ? '打开拜访准备包' : `全部加入拜访准备（${questions.length - visitAdded.size}）`}</button>
                  <button className="btn gold sm" onClick={() => setMinutesOpen(true)}><Icons.NotebookPen size={13} />生成会谈纪要模板</button>
                  <span className="ai-tag" style={{ marginLeft: 'auto' }}>需人工复核</span>
                </div>
              </div>
            </div>

            {/* 右：对标 / 预测 / 评分 / 价值 */}
            <div className="col col3">
              <div className="card blue">
                <div className="card-h"><div className="card-t"><span className="dot" />同业对标</div><span className="chip blue"><i />{benchStat.better} 优 · {benchStat.worse} 弱</span></div>
                <p className="card-s" style={{ marginBottom: 6 }}>{benchNoteFor(co.industry)}</p>
                <div className="bench-row" style={{ color: 'var(--ink-3)', fontWeight: 800, borderBottom: '1px solid var(--line)' }}><span>指标</span><span className="bv">{co.name.slice(0, 4)} 2025</span><span className="bb">行业中位</span><span /></div>
                {BENCHMARK_IDS.map((id) => {
                  const r = ratioById(id); const v = ratioValue(computed, id, 2025); const p = benchPill(r, v, bench[id]);
                  return (
                    <div key={id} className="bench-row">
                      <span style={{ cursor: 'pointer' }} onClick={() => setRatioOpen(id)}>{r.name}</span>
                      <span className="bv num">{fmtRatio(v, r.unit)}</span>
                      <span className="bb num">{fmtRatio(bench[id] ?? null, r.unit)}</span>
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
                      <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: '#8c8478' }} tickFormatter={(v: number) => fmtMoney(v)} />
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
                {forecast.gap > 0 ? (
                  <div className="gap-callout">
                    <Icons.TrendingDown size={22} color="#c3272b" />
                    <div>
                      <div className="card-s">{forecast.gapQuarter} · {forecast.minMonth} 月末现金最低 {fmtMoney(forecast.minCash)} 万，低于安全线 {forecast.safety} 万</div>
                      <b className="red-text num">资金缺口 ≈ {fmtMoney(forecast.gap)} 万</b>
                    </div>
                  </div>
                ) : (
                  <div className="gap-callout" style={{ background: 'var(--g-green-soft)', boxShadow: 'inset 0 0 0 1px rgba(31,138,90,.25)' }}>
                    <Icons.TrendingUp size={22} color="#1f8a5a" />
                    <div>
                      <div className="card-s">{forecast.gapQuarter} · {forecast.minMonth} 月末现金最低 {fmtMoney(forecast.minCash)} 万，高于安全线 {forecast.safety} 万</div>
                      <b className="green-text num">全年无资金缺口</b>
                    </div>
                  </div>
                )}
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
                  <div className="row" style={{ borderColor: 'rgba(255,255,255,.15)' }}><span>EV / EBITDA {multiplesFor(co.industry).ebitdaLow}–{multiplesFor(co.industry).ebitdaHigh}×</span><span className="num">{(val.evLow / 10000).toFixed(2)} – {(val.evHigh / 10000).toFixed(2)} 亿</span></div>
                  <div className="row" style={{ borderColor: 'rgba(255,255,255,.15)' }}><span>EV / Sales {multiplesFor(co.industry).salesLow}–{multiplesFor(co.industry).salesHigh}×</span><span className="num">{(val.evSalesLow / 10000).toFixed(2)} – {(val.evSalesHigh / 10000).toFixed(2)} 亿</span></div>
                  <div className="row" style={{ borderColor: 'rgba(255,255,255,.15)' }}><span>净债务（有息负债 − 货币资金）</span><span className="num">{fmtMoney(val.netDebt)} 万</span></div>
                </div>
                <div className="ev-range">
                  <i style={{ left: '8%', width: '84%' }} />
                  <em style={{ left: '8%', width: `${Math.max(2, (val.equityHigh / Math.max(1, val.evHigh, val.evSalesHigh)) * 84)}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,248,232,.85)' }}>
                  <span>企业价值 {(Math.min(val.evLow, val.evSalesLow) / 10000).toFixed(1)}–{(Math.max(val.evHigh, val.evSalesHigh) / 10000).toFixed(1)} 亿</span>
                  <span>股权价值约 {(val.equityLow / 10000).toFixed(1)}–{(val.equityHigh / 10000).toFixed(1)} 亿（绿色部分）</span>
                </div>
                <p style={{ fontSize: 11.5, marginTop: 8, color: 'rgba(255,248,232,.8)' }}>
                  {val.netDebt <= 0
                    ? '净债务为负（现金多于有息负债）：企业对银行债务依赖度低，授信的价值更多在结算、存款与非信贷产品。'
                    : val.netDebt > Math.min(val.evLow, val.evSalesLow)
                      ? '净债务已超过企业价值下限：企业对债务的依赖度高，任何新增授信都应以"改善现金回收"为条件，而非单纯补缺口。'
                      : '净债务处于企业价值区间之内：债务规模与企业价值匹配，授信空间取决于现金流覆盖而非资产规模。'}
                </p>
                <div className="ai-tag" style={{ marginTop: 8, background: 'rgba(255,255,255,.15)', color: '#fff8e8' }}><Icons.Sparkles size={11} />倍数区间为行业经验值 · 结论文字由 AI 生成</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <span className="ai-tag" style={{ fontSize: 12, padding: '6px 14px' }}><Icons.ShieldCheck size={13} />指标由前端计算，AI 仅生成解释文字 · 需人工复核</span>
          </div>
        </div>
      )}

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
            {bench[ratio.id] !== undefined && <div className="sub">{co.industry}行业中位数（公开数据估算）：<b className="num">{fmtRatio(bench[ratio.id], ratio.unit)}</b> · 2025 年 {benchPill(ratio, ratio.calc(computed, 2025), bench[ratio.id]).text}行业</div>}
            <div className="sub" style={{ marginTop: 10 }}>原表坐标（点击定位到左侧报表并高亮）</div>
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

      {/* 会谈纪要模板 */}
      {minutesOpen && (
        <div className="overlay" onClick={() => setMinutesOpen(false)}>
          <div className="card pop fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="card-h">
              <div className="card-t"><span className="dot" />会谈纪要模板 · {co.name}</div>
              <button className="btn ghost sm" onClick={() => setMinutesOpen(false)}><Icons.X size={13} />关闭</button>
            </div>
            <p className="card-s" style={{ marginBottom: 8 }}>已把 AI 结论与 5 个追问整理成会谈纪要骨架；会谈时逐项填写客户答复与佐证材料。</p>
            <pre className="minutes">{minutes}</pre>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
              <button className="btn sm" onClick={() => { exportHtml(`${co.name}会谈纪要模板`, `<pre style="font-family:inherit;white-space:pre-wrap">${minutes.replace(/</g, '&lt;')}</pre>`, 'doc'); setToast('已导出会谈纪要模板（Word）'); }}><Icons.FileType size={13} />导出 Word</button>
              <button className="btn gold sm" onClick={() => { navigator.clipboard?.writeText(minutes).then(() => setToast('已复制到剪贴板')).catch(() => setToast('复制失败，请手动选择文本')); }}><Icons.Copy size={13} />复制文本</button>
              <button className="btn ghost sm" onClick={() => { setMinutesOpen(false); nav('/f/F-SY-002'); }}><Icons.NotebookPen size={13} />去会谈纪要工作页</button>
              <span className="ai-tag" style={{ marginLeft: 'auto' }}>AI 生成 · 需人工复核</span>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast fade-in"><Icons.CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{toast}</div>}
    </div>
  );
}

function describeTrend(r: RatioDef, c: Computed): string {
  const a = r.calc(c, 2023), b = r.calc(c, 2025);
  if (a === null || b === null) return '缺少同比基数或该指标在当前数据下不适用。';
  const up = b > a;
  const good = r.better === 'mid' ? null : r.better === 'high' ? up : !up;
  const dir = up ? '上升' : '下降';
  if (good === null) return `${dir}，需结合上下游议价能力判断。`;
  return good ? `${dir}属改善方向，但仍需对照行业中位数看绝对水平。` : `${dir}属恶化方向，建议在授信报告财务分析章节说明原因并设置贷后监测阈值。`;
}
