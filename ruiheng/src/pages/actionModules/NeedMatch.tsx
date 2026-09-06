import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { COMPANIES, companyById, type Company } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';
import { type ActionModule, type ModuleCtx, hashStr, iso, addDays, Sec, AiCard, Field, Check, ChipPick, Empty } from './shared';

/* ====================================================================== 客户需求产品匹配（F-YX-001） */
type Source = '访谈' | '事件' | '流水';
type Strength = '高' | '中' | '低';
interface Feature { id: string; name: string; evidence: string; strength: Strength; keys: string[]; on: boolean }
interface Product { id: string; name: string; needs: string[]; entry: string[]; excl?: string; note: string }
const PRODUCTS: Product[] = [
  { id: 'liudong', name: '流动资金贷款', needs: ['资金缺口', '采购', '周转'], entry: ['近两年无不良记录，经营正常', '用途为日常经营周转', '单笔超 500 万采用受托支付'], excl: 'bill', note: '与票据组合时避免同一采购重复融资' },
  { id: 'fixed', name: '固定资产贷款', needs: ['设备', '扩产', '产线', '项目'], entry: ['项目资本金比例 ≥ 20%', '项目备案 / 环评手续齐备', '在建工程或设备抵押'], excl: 'lease', note: '与设备融资租赁同源，二选一' },
  { id: 'lease', name: '设备融资租赁（联动租赁公司）', needs: ['设备', '扩产'], entry: ['租赁物权属清晰、可登记', '承租人纳入行内统一授信'], excl: 'fixed', note: '与固定资产贷款同源，二选一' },
  { id: 'bill', name: '银行承兑汇票 / 票据贴现', needs: ['票据', '采购', '账期'], entry: ['真实贸易背景与合同、发票匹配', '保证金比例按授信条件执行'], excl: 'liudong', note: '与流动资金贷款同源，避免重复融资' },
  { id: 'fx', name: '远期结汇 / 外汇掉期', needs: ['避险', '结汇', '外币'], entry: ['实需原则，有真实收付汇背景', '签署外汇衍生品交易授权与风险揭示'], note: '' },
  { id: 'guarantee', name: '履约 / 投标保函', needs: ['保函', '中标', '履约'], entry: ['基础交易合同或中标通知书', '保证金或占用授信额度'], note: '' },
  { id: 'cash', name: '集团现金管理 / 资金归集', needs: ['归集', '子公司', '沉淀', '现金管理'], entry: ['集团出具归集授权', '成员企业在本行开立账户'], note: '' },
  { id: 'payroll', name: '代发工资 + 收单', needs: ['代发', '收单'], entry: ['开立基本户或一般户', '提供代发名册与协议'], note: '' },
  { id: 'wealth', name: '对公结构性存款 / 通知存款', needs: ['理财', '闲置', '沉淀'], entry: ['完成风险承受能力评估', '产品适当性匹配'], note: '' },
  { id: 'scf', name: '供应链金融（应收账款融资）', needs: ['应收', '账期', '供应商'], entry: ['核心企业确权或付款承诺', '应收账款转让登记'], note: '' },
  { id: 'ma', name: '并购贷款', needs: ['并购'], entry: ['并购方自有资金比例 ≥ 40%', '与标的具有产业相关度', '期限不超过 7 年'], note: '' },
];
const SW: Record<Strength, number> = { 高: 3, 中: 2, 低: 1 };
const SOURCES: Array<{ k: Source; icon: string; desc: string }> = [
  { k: '访谈', icon: 'MessagesSquare', desc: '上次拜访要点、客户明确提出的诉求' },
  { k: '事件', icon: 'Newspaper', desc: '中标、定点、新设子公司、工商变更等公开事件' },
  { k: '流水', icon: 'Landmark', desc: '账户结算流水（授权范围内）：收付结构、币种、沉淀' },
];
const NOTE_BY_SOURCE: Record<Source, (co: Company) => string> = {
  访谈: (co) => `财务负责人反馈：${co.note}。近期关注资金安排与结算便利，希望本行给出组合方案与时间表。`,
  事件: (co) => `公开事件：${co.tags.join('、')}；${co.note}。`,
  流水: (co) => `近 6 个月流水：年结算 ${co.settlement.toLocaleString('zh-CN')} 万，存款日均 ${co.deposit.toLocaleString('zh-CN')} 万；${co.tags[0] ?? ''}。`,
};

function buildFeatures(co: Company, src: Source): Feature[] {
  const r = rng(hashStr(co.id + src));
  const st = (base: Strength) => (r() < 0.2 ? (base === '高' ? '中' : base === '中' ? '低' : '低') : base);
  const out: Feature[] = [];
  const add = (name: string, evidence: string, keys: string[], strength: Strength) => { if (!out.some((f) => f.name === name)) out.push({ id: `${out.length}-${name}`, name, evidence, strength: st(strength), keys, on: true }); };
  const tags = co.tags.join(' ') + ' ' + co.note;
  if (/定点|扩建|专精|产线|扩产/.test(tags)) add('扩产设备投入资金缺口', `${co.tags.find((t) => /定点|扩建|专精/.test(t)) ?? '扩产'}，设备与备货投入集中在未来 6 个月`, ['设备', '扩产', '产线', '资金缺口'], '高');
  if (/收汇|结汇|出口|东盟/.test(tags)) add('出口收汇汇率避险', '外币收汇占比高，账期 60–90 天，存在汇率波动敞口', ['避险', '结汇', '外币'], '高');
  if (/子公司|集团/.test(tags)) add('子公司开户与资金归集', '多家成员企业未在本行开户，集团资金分散', ['归集', '子公司', '现金管理', '沉淀'], '高');
  if (/应收|担保|经销商|供应商/.test(tags)) add('应收账款账期长', '对下游应收规模大、账期长，占用营运资金', ['应收', '账期', '供应商'], '中');
  if (/结算量.*上升|收单/.test(tags)) add('收单与现金管理', '结算量上升，门店收款与资金归集需求增加', ['收单', '现金管理', '代发'], '中');
  if (/续贷|到期/.test(tags)) add('授信到期续作', '存量授信临近到期，需提前安排续作与用途核实', ['资金缺口', '周转'], '高');
  if (/固定资产|光伏/.test(tags)) add('项目建设期资金', '产线扩建项目建设期投入大，需匹配长期资金', ['项目', '扩产', '设备'], '高');
  if (/质押|专精/.test(tags)) add('科创信用贷续作', '知识产权质押到期续作，可叠加信用类产品', ['资金缺口', '周转'], '中');
  if (/涉农/.test(tags)) add('涉农经营周转', '季节性采购集中，需要短期周转资金', ['资金缺口', '采购', '周转'], '中');
  if (src === '访谈') { add('日常经营周转资金缺口', '访谈中提到旺季备货与账期错配', ['资金缺口', '采购', '周转'], '中'); add('员工代发与收单', '访谈提及员工规模扩张与发薪便利', ['代发', '收单'], '低'); add('闲置资金短期理财', '月末沉淀资金希望获得收益', ['理财', '闲置', '沉淀'], '低'); }
  if (src === '事件') { add('中标 / 定点带来的保函需求', '新项目需提供履约保函或投标保函', ['保函', '中标', '履约'], '中'); if (co.exposure >= 2000) add('外延并购意向', '公开信息显示有产业整合意向', ['并购'], '低'); }
  if (src === '流水') { add('大额对公付款集中', '采购付款集中在月末，适合票据支付', ['票据', '采购', '账期'], '中'); add('月末资金沉淀', '月末余额显著高于日均，存在沉淀资金', ['沉淀', '理财', '闲置'], '中'); if (/收汇|出口/.test(tags)) add('外币收汇频繁', '月均外币入账 3 笔以上', ['外币', '结汇', '避险'], '中'); }
  return out.slice(0, 6);
}

function NeedMatch({ ctx }: { ctx: ModuleCtx }) {
  const { step, setStep, tasks, cols, selected, select, addTask, moveTask, addLog, toast, nav } = ctx;
  const [coId, setCoId] = useState(selected?.coId ?? COMPANIES[0].id);
  const co = companyById(coId);
  const [src, setSrc] = useState<Source>('访谈');
  const [note, setNote] = useState(NOTE_BY_SOURCE['访谈'](companyById(coId)));
  const [feats, setFeats] = useState<Feature[]>([]);
  const [custom, setCustom] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [opinion, setOpinion] = useState('');
  const [reviewer, setReviewer] = useState(PERSONAS[2].id);
  const [reviewed, setReviewed] = useState<'pass' | 'back' | null>(null);
  const task = tasks.find((t) => t.id === taskId);

  const identify = () => {
    const f = buildFeatures(co, src); setFeats(f); setPicked([]); setReviewed(null);
    const exist = tasks.find((t) => t.coId === co.id && t.col < cols.length - 1);
    const t = exist ?? addTask({ title: `${co.name} 需求匹配（${src}）`, coId: co.id, due: iso(addDays(ctx.today, 2)), priority: 'P2', aiNext: `已识别 ${f.length} 项需求特征，建议进入产品规则匹配` });
    setTaskId(t.id); select(t.id); addLog(t.id, `需求来源「${src}」，AI 识别 ${f.length} 项需求特征`, 'ai');
    toast(`已识别 ${f.length} 项需求特征，可勾选修改`); setStep(1);
  };
  const on = feats.filter((f) => f.on);
  const matches = useMemo(() => {
    const scored = PRODUCTS.map((p) => {
      const hits = on.reduce((a, f) => a + (f.keys.some((k) => p.needs.includes(k)) || p.needs.some((n) => f.name.includes(n)) ? SW[f.strength] : 0), 0);
      const hitF = on.filter((f) => f.keys.some((k) => p.needs.includes(k)) || p.needs.some((n) => f.name.includes(n)));
      return { p, hits, hitF };
    });
    const best = Math.max(1, ...scored.map((s) => s.hits));
    const r = rng(hashStr(co.id + src) + on.length);
    return scored.map((s) => ({ ...s, score: s.hits === 0 ? 0 : Math.min(97, Math.round(30 + 66 * (s.hits / best) + (r() - 0.5) * 6)) })).filter((s) => s.score >= 40).sort((a, b) => b.score - a.score);
  }, [on, co.id, src]);
  const exclWarn = (p: Product) => { const other = p.excl && picked.includes(p.excl) && picked.includes(p.id) ? PRODUCTS.find((x) => x.id === p.excl) : undefined; return other ? `与「${other.name}」同源需求：${p.note}` : ''; };
  const pickedProds = PRODUCTS.filter((p) => picked.includes(p.id));
  const toReview = () => { if (!task) return; moveTask(task.id, Math.min(cols.length - 1, 2), `匹配 ${pickedProds.length} 项产品，生成复核单`); addLog(task.id, `拟推荐：${pickedProds.map((p) => p.name).join('、')}`, 'ai'); toast('复核单已生成'); setStep(3); };
  const review = (pass: boolean) => {
    if (!task) return; setReviewed(pass ? 'pass' : 'back');
    addLog(task.id, `${PERSONAS.find((p) => p.id === reviewer)?.name} 复核${pass ? '通过' : '退回'}${opinion.trim() ? `：${opinion.trim()}` : ''}`, 'user');
    if (pass) { toast('复核通过，可转入方案或拜访'); setStep(4); } else { moveTask(task.id, 1, '复核退回，重新匹配'); toast('已退回至产品匹配'); setStep(2); }
  };
  const transfer = (to: string, label: string) => { if (task) { moveTask(task.id, cols.length - 1, `转入${label}`); addLog(task.id, `已转入${label}`, 'sys'); } toast(`已转入${label}，匹配结果与需求特征随单带入`); if (to) nav(to); };

  if (step === 0) return (
    <>
      <AiCard text={`建议选择「访谈」作为需求来源：${co.name} 上次访谈要点完整度高；配合流水可提升识别准确率。识别仅使用本行数据与客户授权信息。`} />
      <Field label="客户" req>
        <select className="af-inp" value={coId} onChange={(e) => { setCoId(e.target.value); setNote(NOTE_BY_SOURCE[src](companyById(e.target.value))); }}>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.industry} · {c.relation}</option>)}</select>
        <div className="af-row" style={{ marginTop: 6 }}>{co.tags.map((t) => <span key={t} className="chip"><i />{t}</span>)}</div>
      </Field>
      <Field label="需求来源" req>
        <div className="af-src">{SOURCES.map((s) => <div key={s.k} className={`s${src === s.k ? ' on' : ''}`} onClick={() => { setSrc(s.k); setNote(NOTE_BY_SOURCE[s.k](co)); }}><b>{s.k}</b>{s.desc}</div>)}</div>
      </Field>
      <Field label={`${src}要点`} hint="可补充客户明确提出的需求"><textarea className="af-inp" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="af-row end"><button className="btn" onClick={identify}><Icons.ScanSearch size={13} />识别需求特征</button></div>
    </>
  );

  if (step === 1) return (
    <>
      {feats.length === 0 ? <Empty icon="ScanSearch" title="尚未识别需求" sub="返回第一步选择客户与需求来源后识别" /> : (
        <>
          <AiCard text={`识别出 ${feats.length} 项需求特征，置信度最高的是「${feats[0]?.name}」${feats[1] ? `与「${feats[1].name}」` : ''}。取消勾选不成立的特征，或补充客户明确提出的需求。`} />
          <Sec extra={`${on.length}/${feats.length} 已勾选`}>需求特征清单 · {co.name}</Sec>
          {feats.map((f) => <Check key={f.id} on={f.on} label={f.name} sub={`依据：${f.evidence}`} onClick={() => setFeats((fs) => fs.map((x) => (x.id === f.id ? { ...x, on: !x.on } : x)))} right={<span className={`chip ${f.strength === '高' ? 'red' : f.strength === '中' ? 'orange' : 'blue'}`}><i />{f.strength}</span>} />)}
          <div className="af-row" style={{ marginTop: 8 }}>
            <input className="af-inp sm" style={{ flex: 1 }} placeholder="补充需求特征，如：设备采购付款需要 6 个月账期" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <button className="btn ghost sm" disabled={!custom.trim()} onClick={() => { setFeats((fs) => [...fs, { id: `c-${fs.length}`, name: custom.trim(), evidence: '客户经理补充', strength: '中', keys: ['资金缺口', '采购', '账期', '设备', '结汇', '代发', '理财', '保函', '并购', '归集'].filter((k) => custom.includes(k)), on: true }]); setCustom(''); }}><Icons.Plus size={12} />添加</button>
          </div>
          <div className="af-row end" style={{ marginTop: 10 }}><button className="btn" disabled={!on.length} onClick={() => { if (task) moveTask(task.id, 1, `确认 ${on.length} 项需求特征，进入产品规则匹配`); setStep(2); }}><Icons.Layers size={13} />匹配产品（{on.length} 项特征）</button></div>
        </>
      )}
    </>
  );

  if (step === 2) return (
    <>
      {feats.length === 0 ? <Empty icon="Layers" title="尚未识别需求" /> : (
        <>
          <AiCard text={`按行内产品准入规则匹配到 ${matches.length} 项产品。${matches.find((m) => m.p.excl && matches.some((x) => x.p.id === m.p.excl)) ? '固定资产贷款与设备融资租赁、流动资金贷款与票据存在同源需求，建议各选其一。' : ''}勾选拟推荐产品后生成复核单。`} adopted={picked.length > 0 && matches.slice(0, 3).every((m) => picked.includes(m.p.id))} onAdopt={() => { const top = matches.slice(0, 3).map((m) => m.p.id).filter((id, _, arr) => { const p = PRODUCTS.find((x) => x.id === id)!; return !(p.excl && arr.indexOf(p.excl) >= 0 && arr.indexOf(p.excl) < arr.indexOf(id)); }); setPicked(top); toast(`已采用 AI 推荐的 ${top.length} 项产品`); }} adoptLabel="采用推荐组合" />
          <Sec extra={`${picked.length} 项已勾选`}>产品规则匹配</Sec>
          {matches.map(({ p, score, hitF }) => { const warn = exclWarn(p); return (
            <div key={p.id} className={`af-prod${picked.includes(p.id) ? ' on' : ''}`}>
              <div className="h">
                <span className={`af-check${picked.includes(p.id) ? ' on' : ''}`} style={{ padding: 0, margin: 0, background: 'none', boxShadow: 'none' }} onClick={() => setPicked((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))}><span className="bx">{picked.includes(p.id) && <Icons.Check size={11} />}</span></span>
                <b>{p.name}</b>
                <span className={`pct ${score >= 75 ? 'green-text' : score >= 55 ? 'gold-text' : ''}`}>{score}%</span>
              </div>
              <div className="bar"><i style={{ width: `${score}%` }} /></div>
              <div className="af-mini">命中需求：{hitF.map((f) => f.name).join('、') || '—'}</div>
              <div className="entry"><span className="af-mini" style={{ marginRight: 2 }}>准入要点</span>{p.entry.map((e) => <span key={e} className="chip green"><i />{e}</span>)}</div>
              {warn && <div className="warn"><Icons.TriangleAlert size={13} />{warn}</div>}
            </div>); })}
          <div className="af-row end"><button className="btn" disabled={!picked.length} onClick={toReview}><Icons.ClipboardCheck size={13} />生成复核单（{picked.length} 项）</button></div>
        </>
      )}
    </>
  );

  if (step === 3) return (
    <>
      {pickedProds.length === 0 ? <Empty icon="ClipboardCheck" title="尚无待复核的产品" sub="请先在上一步勾选拟推荐产品" /> : (
        <>
          <AiCard text="复核要点：准入条件是否满足、授信额度是否在权限内、用途是否合规、是否存在同源重复融资。建议由团队负责人复核后转出。" />
          <Sec extra={co.name}>复核单</Sec>
          <div className="af-table-wrap">
            <table className="tbl">
              <thead><tr><th>产品</th><th>匹配度</th><th>准入要点</th><th>预检</th></tr></thead>
              <tbody>{pickedProds.map((p) => { const m = matches.find((x) => x.p.id === p.id); const warn = exclWarn(p); return <tr key={p.id}><td><b>{p.name}</b></td><td><b>{m?.score ?? '—'}%</b></td><td className="af-mini">{p.entry.join('；')}</td><td>{warn ? <span className="chip orange"><i />同源提示</span> : <span className="chip green"><i />通过</span>}</td></tr>; })}</tbody>
            </table>
          </div>
          <div className="af-grid2" style={{ marginTop: 10 }}>
            <Field label="复核人"><select className="af-inp" value={reviewer} onChange={(e) => setReviewer(e.target.value)}>{PERSONAS.filter((p) => p.id !== 'lin').map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select></Field>
            <Field label="复核结论">{reviewed ? <span className={`chip ${reviewed === 'pass' ? 'green' : 'red'}`}><i />{reviewed === 'pass' ? '已通过' : '已退回'}</span> : <span className="chip"><i />待复核</span>}</Field>
          </div>
          <Field label="复核意见"><textarea className="af-inp" placeholder="准入、额度、用途、同源融资等意见……" value={opinion} onChange={(e) => setOpinion(e.target.value)} /></Field>
          <div className="af-row end"><button className="btn ghost" onClick={() => review(false)}><Icons.Undo2 size={13} />退回重匹配</button><button className="btn green" onClick={() => review(true)}><Icons.CircleCheckBig size={13} />复核通过</button></div>
        </>
      )}
    </>
  );

  return (
    <>
      <AiCard tone="green" text={`${co.name} 匹配结果已具备转方案条件：${pickedProds.map((p) => p.name).join('、') || '尚未选择产品'}。转入后需求特征、匹配度与复核意见随单带入。`} />
      <Sec>一键转入</Sec>
      <div className="af-big">
        <button className="b gold" onClick={() => transfer('/f/F-YX-002', '场景化营销方案')}><b><Icons.Sparkles size={15} />场景化方案</b><span>按客户场景组合产品与触达时点</span></button>
        <button className="b red" onClick={() => transfer('/f/F-YX-003', '产品组合顾问')}><b><Icons.Layers size={15} />产品组合顾问</b><span>综合定价与组合收益测算</span></button>
        <button className="b green" onClick={() => transfer('/f/F-KH-002', '拜访计划')}><b><Icons.CalendarPlus size={15} />加入拜访计划</b><span>生成准备包与话术</span></button>
      </div>
      <Sec>转出摘要</Sec>
      <div className="af-kv">
        <div className="row"><span>客户</span><span>{co.name} · {co.industry}</span></div>
        <div className="row"><span>需求来源</span><span>{src}</span></div>
        <div className="row"><span>需求特征</span><span>{on.map((f) => f.name).join('、') || '—'}</span></div>
        <div className="row"><span>拟推荐产品</span><span>{pickedProds.map((p) => p.name).join('、') || '—'}</span></div>
        <div className="row"><span>复核</span><span>{reviewed === 'pass' ? `通过 · ${PERSONAS.find((p) => p.id === reviewer)?.name}` : '待复核'}</span></div>
      </div>
    </>
  );
}

export const NeedMatchModule: ActionModule = { Component: NeedMatch, wide: (s) => s === 2 || s === 3 };
