import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Check, RotateCcw, ClipboardList, Building2, Lightbulb, MessageCircleQuestion, Search, ShieldCheck, Users, Shirt, ArrowRight, FileText, Briefcase } from 'lucide-react';
import { PERSONAS } from '../data/personas';
import { companyById } from '../data/companies';
import './scenes.css';

const STEPS = [
  { t: '工商变更与公开信息', p: '近 6 个月：新设东莞子公司（100% 持股，2026-07）；经营范围新增「模具制造」；8 月中标某新能源车企二期模具项目；无被执行、无股权出质。' },
  { t: '需求推断', p: '定点 → 模具与设备投入；SOP 放量 → 备货流动资金；出口收汇 30% → 汇率避险。三条需求分别对应固定资产贷款 / 设备租赁、流贷、远期结汇。' },
  { t: '异议预判', p: '上次访谈提及 X 行 3.2% 且免担保；首次授信担心审批周期；东莞子公司财报尚未准备好，可能不愿提供。' },
  { t: '材料清单', p: '征信授权书副本、尽调提纲、上次访谈纪要、现场核查表、设备与订单核对表、产品折页与名片；不携带任何他行信息。' },
  { t: '礼仪卡', p: '民企、二次尽调、财务总监在场：先谈生意再谈材料，不追问东莞子公司财报的原因，收尾明确下一步与时间点。' },
];

const NEEDS = [
  { b: '定点后模具与设备投入', s: '获某新能源车企定点，模具与加工中心需在 SOP 前到位，预计投入 3,500 万。', to: '固定资产贷款 或 设备融资租赁' },
  { b: 'SOP 放量后的备货', s: 'SOP 后年供货约 1.2 亿，铝材与外协备货周期 45 天，流动资金缺口约 1,500 万。', to: '备货流动资金贷款 · 供应链票据' },
  { b: '出口收汇的汇率波动', s: '出口收汇占比 30%，以美元结算，账期 60–90 天。', to: '远期结汇 · 期权组合等汇率避险' },
];

const QUESTIONS = ['定点项目的 SOP 时间点和爬坡节奏是怎样的？模具与设备到位排期是否已定？', '东莞子公司承担哪部分产能，与母公司之间的结算与资金安排是怎样的？', '出口部分的收汇周期与结算币种，目前如何处理汇率波动？'];

const CLUES = [
  { src: '动产融资统一登记公示', body: '2026-06 宁桂将 2 台加工中心向某租赁公司办理融资租赁登记——说明客户已有设备融资渠道，本行方案需在期限或综合成本上有差异化。' },
  { src: '客户上次访谈提及', body: '财务总监提到 X 行给出 3.2% 流贷报价并免担保，但额度与放款条件尚未落地。' },
  { src: '招投标公告', body: '8 月中标某新能源车企二期模具项目，交付周期 8 个月——资金需求前置，本行若 30 天内完成审批具备时间优势。' },
];

const MATERIALS = { wang: ['征信授权书副本与尽调提纲', '上次访谈纪要（含 X 行报价记录）', '固定资产贷款与设备租赁方案要点', '远期结汇产品说明'], lin: ['现场核查表（开工率、电费、库存）', '设备与订单核对表', '拍照与记录清单', '产品折页与名片'] };

function useSteps(total: number, running: boolean, token: number, gap = 850) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!running) return;
    const timers: number[] = [];
    for (let i = 1; i <= total + 1; i++) timers.push(window.setTimeout(() => setN(i), gap * i));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [running, token, total, gap]);
  return n;
}

export default function VisitPrep() {
  const [q, setQ] = useState('帮我准备宁桂精密的尽调拜访');
  const [run, setRun] = useState(0);
  const n = useSteps(STEPS.length, run > 0, run);
  const finished = run > 0 && n > STEPS.length;
  const co = companyById('ninggui');
  const wang = PERSONAS.find((p) => p.id === 'wang')!;
  const lin = PERSONAS.find((p) => p.id === 'lin')!;
  const stateOf = (i: number) => (i < n - 1 ? 'done' : i === n - 1 && n <= STEPS.length ? 'active' : 'pending');

  return (
    <div>
      <div className="page-h">
        <div>
          <h1><ClipboardList size={20} style={{ verticalAlign: -3, marginRight: 6 }} />尽调拜访准备</h1>
          <p>09:30 · 林小雨 · 宁桂精密二次尽调前，用一页准备单把近况、需求、异议与礼仪理清。</p>
        </div>
        <span className="ai-tag"><Sparkles size={12} /> 线索仅用公开信息与客户自述 · 不查征信</span>
      </div>

      <div className="card fade-in">
        <div className="vp-input">
          <Search size={16} color="var(--ink-3)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="输入客户名与任务……" />
          <button className="btn" onClick={() => setRun((r) => r + 1)}>{run > 0 ? <><RotateCcw size={14} />重新生成</> : <><Sparkles size={14} />生成准备单</>}</button>
        </div>
        <div className="row-wrap mt8">
          <span className="chip"><i />{co.name}</span><span className="chip green"><i />{co.relation}</span>
          {co.tags.map((t) => <span key={t} className="chip blue"><i />{t}</span>)}
          <span className="muted">主办 {wang.name} · 协办 {lin.name}</span>
        </div>
      </div>

      <div className="vp-cols mt16">
        {/* 思考流 */}
        <div className="card fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><span className="dot" />准备思考流{run > 0 && !finished && <span className="pulse" />}</div><span className="card-s">5 步</span></div>
          {run === 0 && (
            <div className="think-empty"><div><div className="ring"><ClipboardList size={22} /></div>点击「生成准备单」<br />按「公开信息 → 需求 → 异议 → 材料 → 礼仪」五步推理。</div></div>
          )}
          {run > 0 && (
            <div className="think">
              {STEPS.map((s, i) => {
                const st = stateOf(i);
                if (st === 'pending') return null;
                return (
                  <div key={s.t} className={`step fade-in ${st}`}>
                    <div className="n">{st === 'done' ? <Check size={12} /> : i + 1}</div>
                    <div className="bd"><div className="hd"><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div>
                  </div>
                );
              })}
              {finished && <div className="ai-tag fade-in"><Sparkles size={11} /> 准备单已生成 · AI 辅助 · 需客户经理确认</div>}
            </div>
          )}
        </div>

        {/* 准备单 */}
        <div>
          {!finished && (
            <div className="card fade-in" style={{ animationDelay: '160ms' }}>
              <div className="card-h"><div className="card-t"><FileText size={14} />一页准备单</div><span className="card-s">{run > 0 ? '生成中……' : '等待生成'}</span></div>
              <div className="think-empty" style={{ minHeight: 200 }}><div>{run > 0 ? '正在整理近况、需求、异议、分工与礼仪卡……' : '准备单将在推理完成后显示。'}</div></div>
            </div>
          )}
          {finished && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card gold fade-in">
                <div className="card-h"><div className="card-t"><FileText size={14} />一页准备单 · {co.name}</div><span className="card-s">二次尽调 · 财务总监在场 · 预计 90 分钟</span></div>

                <div className="sec-h">申报进度</div>
                <div className="prog">
                  <div className="p ok"><b><Check size={12} style={{ verticalAlign: -2 }} /> 已授权征信</b>征信授权书已签署，查询由授信审批环节统一发起</div>
                  <div className="p todo"><b>待实地调查</b>今日完成现场核查，重点看开工率与新设备到位情况</div>
                  <div className="p warn"><b>待补东莞子公司财报</b>2026-07 新设，尚无完整报表，先取开户资料与投资协议</div>
                </div>

                <div className="sec-h">企业近况</div>
                <ul className="ul">
                  <li>获某新能源车企定点，SOP 后年供货约 1.2 亿，模具与设备需在 SOP 前到位。</li>
                  <li>新增东莞子公司（100% 持股），承接华南客户就近配套。</li>
                  <li>出口收汇占比 30%，美元结算，账期 60–90 天。</li>
                </ul>

                <div className="sec-h">可能需求</div>
                <div className="need">
                  {NEEDS.map((x) => <div key={x.b} className="n"><b>{x.b}</b>{x.s}<div className="to"><ArrowRight size={12} />{x.to}</div></div>)}
                </div>

                <div className="sec-h">开场三问</div>
                {QUESTIONS.map((x, i) => <div key={x} className="qa"><span className="q">{i + 1}</span><span>{x}</span></div>)}

                <div className="sec-h">竞品线索</div>
                {CLUES.map((c) => <div key={c.src} className="clue"><span className="chip blue"><i />{c.src}</span><div className="body">{c.body}</div></div>)}
                <p className="muted mt8"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> 线索来源均为公开登记、公告或客户主动告知，不使用征信数据。</p>
              </div>

              <div className="card red objection fade-in" style={{ animationDelay: '80ms' }}>
                <div className="card-h"><div className="card-t"><MessageCircleQuestion size={14} />异议应对</div><span className="chip green"><i />已过合规红线检查：不评价同业、不承诺</span></div>
                <blockquote>「X 行 3.2% 还免担保，你们能做到吗？」</blockquote>
                <div className="say">
                  理解贵司对成本的关注。我们不评价其他银行的方案，只谈本行能为宁桂做什么：一是定点项目的设备投入，本行可按项目周期匹配 5–8 年的固定资产贷款或设备租赁，避免用短贷养长投；二是 SOP 后的备货，可以配供应链票据，综合成本随结算量提升还有下调空间；三是出口部分的远期结汇，把汇率波动锁住。
                  具体利率与担保方式要以审批结果为准，我们争取 30 天内给出明确答复，不耽误您的排期。
                </div>
              </div>

              <div className="card fade-in" style={{ animationDelay: '160ms' }}>
                <div className="card-h"><div className="card-t"><Users size={14} />双人尽调分工与携带材料</div><span className="card-s">主办 {wang.name} · 协办 {lin.name}</span></div>
                <div className="duo">
                  <div className="d">
                    <div className="hd"><span className="pav sm">{wang.avatar}</span><div><b>主办 · {wang.name}</b><br /><span>{wang.focus}</span></div></div>
                    <p className="small" style={{ color: 'var(--ink-2)', marginBottom: 6 }}>主谈财务总监：定点项目现金流、东莞子公司资金安排、授信结构与担保方式。</p>
                    <ul className="ul">{MATERIALS.wang.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                  <div className="d">
                    <div className="hd"><span className="pav sm">{lin.avatar}</span><div><b>协办 · {lin.name}</b><br /><span>{lin.focus}</span></div></div>
                    <p className="small" style={{ color: 'var(--ink-2)', marginBottom: 6 }}>现场核查与记录：开工率、电费、库存、设备铭牌与订单一致性；会后 2 小时内出纪要。</p>
                    <ul className="ul">{MATERIALS.lin.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                </div>
              </div>

              <div className="card dark fade-in" style={{ animationDelay: '240ms' }}>
                <div className="card-h"><div className="card-t"><Shirt size={14} />会谈礼仪与着装卡</div><span className="card-s" style={{ color: 'rgba(255,248,232,.7)' }}>民企 · 二次尽调 · 财务总监在场</span></div>
                <div className="etq">
                  <div className="e"><b>礼仪要点</b><ul className="ul"><li>先谈定点项目进展，再谈材料清单，不以「查」的姿态开场。</li><li>财务总监在场时，问题面向财务总监提出，由主办统一发问，协办只记录。</li><li>不当面追问东莞子公司财报缺失的原因，改为约定补充时间。</li></ul></div>
                  <div className="e"><b>着装建议</b><ul className="ul"><li>商务休闲：深色西装外套 + 不打领带，与民企车间环境相称。</li><li>需进车间：平底鞋，备一次性鞋套；不佩戴外露饰品。</li><li>名片双手递接，先递给财务总监，再递给陪同人员。</li></ul></div>
                  <div className="e"><b>开场与收尾话术</b><ul className="ul"><li>开场：「上次您提到定点项目，这两周有新的进展吗？我们今天主要想把设备与备货节奏对齐。」</li><li>收尾：「三件事：今天现场资料我们今天整理完；东莞子公司资料下周三前补；审批进度我每周五同步您一次。」</li></ul></div>
                </div>
                <div className="row-wrap" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                  <span className="ai-tag" style={{ color: '#fff8e8' }}><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>
                  <div className="row-wrap">
                    <Link to="/scene/sparring" className="btn gold"><Briefcase size={14} />去陪练一次 <ArrowRight size={14} /></Link>
                    <Link to="/scene/fin" className="btn ghost"><Lightbulb size={14} />14:00 财报诊断</Link>
                    <Link to="/scene/postloan" className="btn ghost"><Building2 size={14} />回到晨报</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
