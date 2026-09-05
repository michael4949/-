import { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { PERSONAS } from '../data/personas';
import { companyById } from '../data/companies';
import { BASE_INPUTS, compute, fmtMoney, forecastCash, rowName, stmtById } from '../lib/financials';
import {
  APPROVER_QUESTIONS, CONTRACT_REVIEW, CREDIT_PLAN, MATERIALS, THINK_STEPS, VERIFY_NOTES, WC_PARAM_META, buildChapters, calcWcLoan, countHunks, defaultWcParams, segDiff,
  type Chapter, type VerifyNote, type WcParamMeta, type WcParams,
} from '../lib/wcloan';
import './fin.css';

function ParamInput({ value, base, step, onChange }: { value: number; base: number; step: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { if (Number(txt) !== value) setTxt(String(value)); /* eslint-disable-line */ }, [value]);
  return <input className={`cell num${value !== base ? ' edited' : ''}`} type="number" step={step} value={txt} onChange={(e) => { setTxt(e.target.value); const n = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(n)) onChange(n); }} onBlur={() => setTxt(String(value))} />;
}

type Tab = 'report' | 'contract';
const LEVEL_TXT = { high: '高风险', mid: '中风险', low: '低风险' } as const;

export default function CreditReport() {
  const wang = PERSONAS[1], lin = PERSONAS[0];
  const co = companyById('ninggui');
  const computed = useMemo(() => compute(BASE_INPUTS), []);
  const forecast = useMemo(() => forecastCash(computed), [computed]);
  const [wc, setWc] = useState<WcParams>(() => defaultWcParams(computed));
  const baseWc = useMemo(() => defaultWcParams(computed), [computed]);
  const wcRes = useMemo(() => calcWcLoan(wc), [wc]);

  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle');
  const [stepIdx, setStepIdx] = useState(0);
  const [original, setOriginal] = useState<Chapter[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [tab, setTab] = useState<Tab>('report');
  const [policy, setPolicy] = useState<VerifyNote | null>(null);
  const [refOpen, setRefOpen] = useState<WcParamMeta | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [signW, setSignW] = useState(false);
  const [signL, setSignL] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'thinking') return;
    if (stepIdx >= THINK_STEPS.length) {
      const ch = buildChapters(computed, forecast, calcWcLoan(defaultWcParams(computed)));
      setOriginal(ch); setChapters(ch); setPhase('done');
      return;
    }
    const t = window.setTimeout(() => setStepIdx((i) => i + 1), 750);
    return () => window.clearTimeout(t);
  }, [phase, stepIdx, computed, forecast]);

  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(t); }, [toast]);

  const diffs = useMemo(() => chapters.map((ch, i) => { const segs = segDiff(original[i]?.text ?? '', ch.text); return { id: ch.id, title: ch.title, segs, hunks: countHunks(segs) }; }), [chapters, original]);
  const hunks = diffs.reduce((s, d) => s + d.hunks, 0);
  const modifiedChapters = diffs.filter((d) => d.hunks > 0).length;
  const signed = signW && signL;

  const startDraft = () => { setPhase('thinking'); setStepIdx(0); setSignW(false); setSignL(false); };
  const gotoChapter = (id: string) => { setTab('report'); window.setTimeout(() => document.getElementById(`ch-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
  const updateChapter = (id: string, text: string) => setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));

  return (
    <div className="fin-page with-bar">
      <div className="page-h">
        <div>
          <h1>授信智能工作台 <span className="gold-text">· {co.name}</span></h1>
          <p>材料归档 → AI 起草 → 交叉核对 → 额度测算 → 制度校验 → 审批预演 → 双人复核 · 申请：流动资金贷款 3,000 万 / 12 个月</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="chip red"><i />主办 {wang.name}</span>
          <span className="chip"><i />协办 {lin.name}</span>
          <span className="chip blue"><i />行内评级 {CREDIT_PLAN.rating.grade}（{CREDIT_PLAN.rating.source}）</span>
          <span className="chip purple"><i />演示回放</span>
        </div>
      </div>

      {/* 材料 + 思考流 */}
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-h">
            <div className="card-t"><span className="dot" />材料归档 <span className="card-s">{MATERIALS.length} 项 · 1 项需更新</span></div>
            {phase === 'idle' ? <button className="btn" onClick={startDraft}><Icons.Sparkles size={14} />生成初稿</button>
              : phase === 'thinking' ? <span className="chip orange"><span className="pulse" />起草中…</span>
              : <button className="btn ghost sm" onClick={startDraft}><Icons.RotateCcw size={13} />重新生成（演示回放）</button>}
          </div>
          {MATERIALS.map((m) => (
            <div key={m.name} className={`mat${m.status === 'warn' ? ' warn' : ''}`}>
              <div className="mi">{m.status === 'warn' ? <Icons.AlertTriangle size={14} color="#a34e0a" /> : <Icons.FileCheck2 size={14} color="#1f8a5a" />}</div>
              <div style={{ flex: 1 }}><b>{m.name}</b><span>{m.detail}</span></div>
              <span className={`chip ${m.status === 'warn' ? 'orange' : 'green'}`}><i />{m.chip}</span>
            </div>
          ))}
        </div>
        <div className="card gold">
          <div className="card-h"><div className="card-t"><span className="dot" />AI 思考流</div><span className="ai-tag"><Icons.Sparkles size={11} />本机模型 · 无外联</span></div>
          <div className="think think-live">
            {THINK_STEPS.map((s, i) => {
              const state = phase === 'idle' ? 'pending' : phase === 'done' || stepIdx > i ? 'done' : stepIdx === i ? 'running' : 'pending';
              return (
                <div key={s.title} className={`step ${state}`}>
                  <div className="n">{state === 'done' ? <Icons.Check size={12} /> : i + 1}</div>
                  <div><b>{s.title}{state === 'running' && <span className="pulse" style={{ display: 'inline-block', marginLeft: 8 }} />}</b><p>{s.detail}</p></div>
                </div>
              );
            })}
          </div>
          {phase === 'done' && <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip green"><i />初稿完成：7 章 · 3 处核实标注</span>
            {VERIFY_NOTES.map((v) => <button key={v.id} className="refbtn gold" onClick={() => gotoChapter(v.chapter)}>{v.no} {v.title}</button>)}
          </div>}
        </div>
      </div>

      <div className="credit-layout">
        {/* 左：报告 / 合同 */}
        <div className="col">
          <div className="card">
            <div className="card-h">
              <div className="tabs">
                <button className={`tab${tab === 'report' ? ' active' : ''}`} onClick={() => setTab('report')}>授信报告（七章可编辑）</button>
                <button className={`tab${tab === 'contract' ? ' active' : ''}`} onClick={() => setTab('contract')}>合同审核</button>
              </div>
              {tab === 'report' ? <span className="ai-tag"><Icons.Sparkles size={11} />AI 起草 · 人工修改 {hunks} 处</span> : <span className="chip purple"><i />嵌入合同审查智能体（离线样例）</span>}
            </div>

            {tab === 'report' && (phase !== 'done'
              ? <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>{phase === 'idle' ? '点击「生成初稿」，AI 将按七章模板起草并标注需核实事项。' : '正在逐章起草并交叉核对……'}</div>
              : chapters.map((ch) => {
                const d = diffs.find((x) => x.id === ch.id);
                const notes = VERIFY_NOTES.filter((v) => v.chapter === ch.id);
                return (
                  <div key={ch.id} id={`ch-${ch.id}`} className="chapter">
                    <div className="ch-h">
                      <b>第{ch.no}章 · {ch.title}</b>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {notes.map((n) => <span key={n.id} className="chip orange"><i />核实{n.no}</span>)}
                        {d && d.hunks > 0 ? <span className="chip green"><i />人工修改 {d.hunks} 处</span> : <span className="ai-tag"><Icons.Sparkles size={11} />AI 起草</span>}
                      </div>
                    </div>
                    <textarea className={d && d.hunks > 0 ? 'edited' : ''} value={ch.text} onChange={(e) => updateChapter(ch.id, e.target.value)} />
                    {notes.map((n) => (
                      <div key={n.id} className="verify-note">
                        <div className="vn">{n.no}</div>
                        <div style={{ flex: 1 }}>
                          <b>核实标注 · {n.title}</b>
                          <p>{n.detail}</p>
                          <p className="va">处理建议：{n.action}</p>
                          {n.policy && <div style={{ marginTop: 6 }}><button className="refbtn" onClick={() => setPolicy(n)}><Icons.Scale size={10} /> 查看制度引用</button></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }))}
            {tab === 'report' && phase === 'done' && <div className="ai-tag" style={{ marginTop: 4 }}><Icons.Sparkles size={11} />七章正文由 AI 起草，财务数字来自前端复算 · 需主办 / 协办复核确认</div>}

            {tab === 'contract' && CONTRACT_REVIEW.map((cr) => (
              <div key={cr.contract} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <b style={{ fontSize: 13.5 }}>{cr.contract}</b>
                  <span className="chip red"><i />高 {cr.items.filter((i) => i.level === 'high').length}</span>
                  <span className="chip orange"><i />中 {cr.items.filter((i) => i.level === 'mid').length}</span>
                  <span className="chip"><i />低 {cr.items.filter((i) => i.level === 'low').length}</span>
                </div>
                <div className="contract-item" style={{ background: 'var(--g-gold-soft)', fontWeight: 800, color: 'var(--ink-3)', fontSize: 11 }}><span>条款</span><span>风险</span><span>问题</span><span>修改建议</span></div>
                {cr.items.map((it) => (
                  <div key={it.clause} className={`contract-item ${it.level}`}>
                    <span className="cl">{it.clause}</span>
                    <span className={`chip ${it.level === 'high' ? 'red' : it.level === 'mid' ? 'orange' : 'green'}`} style={{ padding: '2px 8px' }}><i />{LEVEL_TXT[it.level]}</span>
                    <span><span className="lb">风险条款标注</span>{it.issue}</span>
                    <span><span className="lb">修改建议</span>{it.suggest}</span>
                  </div>
                ))}
              </div>
            ))}
            {tab === 'contract' && <div className="ai-tag"><Icons.Sparkles size={11} />合同审查结论为离线样例 · 以法务与合规审核为准</div>}
          </div>
        </div>

        {/* 右：额度测算 / 授信建议 / 审批预演 */}
        <div className="col">
          <div className="card green">
            <div className="card-h"><div className="card-t"><span className="dot" />额度测算</div><span className="chip green"><i />《流动资金贷款管理办法》测算法</span></div>
            {WC_PARAM_META.map((m) => (
              <div key={m.key} className="wc-row">
                <div className="wl"><span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>{m.label}<span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>（{m.unit}）</span></span><span>{m.note}</span></div>
                <ParamInput value={wc[m.key]} base={baseWc[m.key]} step={m.step} onChange={(n) => setWc((p) => ({ ...p, [m.key]: n }))} />
                <button className="refbtn gold" title={m.refLabel} onClick={() => setRefOpen(m)}><Icons.Crosshair size={10} /> 坐标</button>
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              {wcRes.steps.map((s) => <div key={s.label} className="wc-step"><span style={{ fontWeight: 700 }}>{s.label}</span><div className="ex">{s.expr}</div><b className="v num">{s.value}</b></div>)}
            </div>
            <div className="wc-result">
              <div className="tile"><b className="num">{fmtMoney(wcRes.newLoan)}</b><span>新增流贷需求（万元）· 公式测算</span></div>
              <div className="tile"><b className="num">{fmtMoney(forecast.gap)}</b><span>{forecast.gapQuarter} 现金流缺口（万元）· 交叉印证</span></div>
            </div>
            <p className="card-s" style={{ marginTop: 8 }}>两口径差 {fmtMoney(Math.abs(wcRes.newLoan - forecast.gap))} 万（{(Math.abs(wcRes.newLoan - forecast.gap) / Math.max(1, forecast.gap) * 100).toFixed(0)}%），均指向 Q2 缺口；申请 3,000 万略高于测算值，且未扣除其他应收款 1,900 万可收回部分。</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span className="ai-tag"><Icons.Calculator size={11} />公式与数值由前端计算</span>
              {JSON.stringify(wc) !== JSON.stringify(baseWc) && <button className="refbtn" onClick={() => setWc(baseWc)}>恢复报表取值</button>}
            </div>
          </div>

          <div className="card gold">
            <div className="card-h"><div className="card-t"><span className="dot" />授信建议</div><span className="chip orange"><i />有条件同意</span></div>
            <div className="amount-pair">
              <div className="tile"><b className="num">{fmtMoney(CREDIT_PLAN.applied)}</b><span>申请额度（万元）</span></div>
              <div className="arr">→</div>
              <div className="tile"><b className="num red-text">{fmtMoney(CREDIT_PLAN.proposed)}</b><span>建议额度 · {CREDIT_PLAN.term} · {CREDIT_PLAN.price}</span></div>
            </div>
            <div className="card-s" style={{ fontWeight: 800, color: 'var(--ink-2)', margin: '6px 0 4px' }}>担保结构</div>
            {CREDIT_PLAN.guarantees.map((g) => <div key={g.name} className="li" style={{ padding: '7px 10px' }}><Icons.ShieldCheck size={14} color="#9c7a2e" /><div><div className="t">{g.name}</div><div className="s">{g.note}</div></div></div>)}
            <div className="card-s" style={{ fontWeight: 800, color: 'var(--ink-2)', margin: '6px 0 4px' }}>放款前置条件</div>
            <ol style={{ paddingLeft: 18, fontSize: 12, color: 'var(--ink-2)' }}>{CREDIT_PLAN.conditions.map((c) => <li key={c}>{c}</li>)}</ol>
            <div className="policy-box" style={{ background: 'var(--g-blue-soft)' }}>
              <b>行内客户评级 {CREDIT_PLAN.rating.grade} <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>· {CREDIT_PLAN.rating.source} · 结论以内评系统为准</span></b>
              <div style={{ marginTop: 4 }}><span className="ai-tag"><Icons.Sparkles size={11} />AI 仅提示与评级不一致点</span></div>
              <ul style={{ paddingLeft: 16, marginTop: 4 }}>{CREDIT_PLAN.rating.mismatches.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
            <div className="card-s" style={{ fontWeight: 800, color: 'var(--ink-2)', margin: '10px 0 4px' }}>制度与准入校验</div>
            {CREDIT_PLAN.checks.map((c) => <div key={c.name} className={`chk${c.result === 'pass' ? '' : ' warn'}`}><div className="ci"><Icons.Check size={12} /></div><div><b>{c.name} · {c.result === 'pass' ? '通过' : '关注'}</b><span>{c.detail}</span></div></div>)}
            <div className="chk warn"><div className="ci"><Icons.AlertTriangle size={12} /></div><div><b>抵押评估报告有效期 · 未通过</b><span>已超 6 个月，见核实标注③ · <button className="refbtn" style={{ padding: '0 6px' }} onClick={() => setPolicy(VERIFY_NOTES[2])}>制度引用</button></span></div></div>
          </div>

          <div className="card purple">
            <div className="card-h"><div className="card-t"><span className="dot" />审批人预演</div><span className="ai-tag"><Icons.Sparkles size={11} />AI 模拟审查会</span></div>
            {APPROVER_QUESTIONS.map((q, i) => (
              <div key={q.q} className="qa">
                <div className="qn">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <b>{q.q}</b>
                  <span>{q.hint}</span>
                  <div style={{ marginTop: 4 }}><button className="refbtn gold" onClick={() => gotoChapter(q.chapter)} disabled={phase !== 'done'}><Icons.Anchor size={10} /> {q.chapterName}</button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部固定条 */}
      <div className="fixed-bar">
        <div className="ai-log">
          <Icons.Sparkles size={14} color="#c3272b" />
          <span>AI 参与记录：AI 起草 <b>{phase === 'done' ? chapters.length : 0}</b> 段 · 人工修改 <b>{hunks}</b> 处（{modifiedChapters} 章）</span>
          <button className="exp" onClick={() => setShowDiff(true)} disabled={phase !== 'done'}>展开 diff</button>
        </div>
        <div className="sp" />
        <label className={`sign${signW ? ' on' : ''}`}><input type="checkbox" checked={signW} disabled={phase !== 'done'} onChange={(e) => setSignW(e.target.checked)} />主办调查人 {wang.name} 复核确认</label>
        <label className={`sign${signL ? ' on' : ''}`}><input type="checkbox" checked={signL} disabled={phase !== 'done'} onChange={(e) => setSignL(e.target.checked)} />协办调查人 {lin.name} 复核确认</label>
        <button className="btn gold" disabled={!signed} onClick={() => window.print()}><Icons.Printer size={14} />导出 PDF（打印视图）</button>
        <button className="btn green" disabled={!signed} onClick={() => setToast(`已推送信贷系统（模拟）· 流水号 CR-2025-1107-${String(hunks).padStart(3, '0')} · 附 AI 参与记录`)}><Icons.Send size={14} />推送信贷系统（模拟）</button>
      </div>
      {toast && <div className="toast fade-in"><Icons.CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{toast}</div>}

      {/* 制度引用弹层 */}
      {policy?.policy && (
        <div className="overlay" onClick={() => setPolicy(null)}>
          <div className="card pop fade-in" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)' }}>
            <div className="card-h"><div className="card-t"><span className="dot" />制度引用 · 核实标注{policy.no}</div><button className="btn ghost sm" onClick={() => setPolicy(null)}><Icons.X size={13} />关闭</button></div>
            <div className="policy-box">
              <b>{policy.policy.title} {policy.policy.article}</b>
              <p style={{ marginTop: 4 }}>{policy.policy.text}</p>
              <p style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 11 }}>来源：{policy.policy.source}</p>
            </div>
            <p style={{ fontSize: 12, marginTop: 10 }}><b>适用情形：</b>{policy.detail}</p>
            <p style={{ fontSize: 12, marginTop: 4 }}><b>处理建议：</b>{policy.action}</p>
          </div>
        </div>
      )}

      {/* 报表坐标弹层 */}
      {refOpen && (
        <div className="overlay" onClick={() => setRefOpen(null)}>
          <div className="card pop fade-in" onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100%)' }}>
            <div className="card-h"><div className="card-t"><span className="dot" />{refOpen.label} · 取值来源</div><button className="btn ghost sm" onClick={() => setRefOpen(null)}><Icons.X size={13} />关闭</button></div>
            <div className="coord"><span>{refOpen.refLabel}</span>{refOpen.ref && <b className="num">{fmtMoney(computed[refOpen.ref.stmt][refOpen.ref.key][refOpen.ref.year])} 万</b>}</div>
            {refOpen.ref && <p className="sub">原表坐标：{stmtById(refOpen.ref.stmt).name} / {rowName(refOpen.ref.stmt, refOpen.ref.key)} / {refOpen.ref.year}（万元）</p>}
            <p className="sub">当前取值：<b className="num">{wc[refOpen.key]} {refOpen.unit}</b>{wc[refOpen.key] !== baseWc[refOpen.key] && <span className="chip orange" style={{ marginLeft: 6 }}><i />已手工调整，报表口径为 {baseWc[refOpen.key]}</span>}</p>
            <p className="sub">{refOpen.note}</p>
          </div>
        </div>
      )}

      {/* diff 弹层 */}
      {showDiff && (
        <div className="overlay" onClick={() => setShowDiff(false)}>
          <div className="card pop fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="card-h"><div className="card-t"><span className="dot" />AI 参与记录 · 人工修改 {hunks} 处</div><button className="btn ghost sm" onClick={() => setShowDiff(false)}><Icons.X size={13} />关闭</button></div>
            {hunks === 0 && <p className="card-s">尚未修改任何段落；AI 起草内容与当前正文一致。</p>}
            {diffs.filter((d) => d.hunks > 0).map((d) => (
              <div key={d.id}>
                <div style={{ fontSize: 12.5, fontWeight: 800, margin: '6px 0' }}>{d.title} <span className="chip green" style={{ marginLeft: 6 }}><i />{d.hunks} 处</span></div>
                <div className="diff-block">{d.segs.map((s, i) => <span key={i} className={`diff-seg ${s.kind}`}>{s.text}</span>)}</div>
              </div>
            ))}
            <p className="card-s" style={{ marginTop: 6 }}>红色删除线为 AI 原文，绿色为人工修改；记录随报告一并归档。</p>
          </div>
        </div>
      )}
    </div>
  );
}
