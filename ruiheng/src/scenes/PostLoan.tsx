import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Gavel, Landmark, Newspaper, Wallet, Check, X, Send, RotateCcw, Sparkles, Camera, Zap, BookOpen, Factory, ArrowRight, Sun } from 'lucide-react';
import { PERSONAS } from '../data/personas';
import { companyById } from '../data/companies';
import './scenes.css';

type Sev = 'red' | 'orange' | 'gold' | 'green' | 'blue';
interface Brief { id: string; kind: '预警' | '商机' | '政策'; sev: Sev; title: string; sub: string; chip: string }
const BRIEF: Brief[] = [
  { id: 'caisheng', kind: '预警', sev: 'red', title: '彩晟商贸', sub: '新增被执行 860 万 · 近三月结算量 -62%', chip: '红色预警' },
  { id: 'beiling', kind: '预警', sev: 'orange', title: '北岭铝材', sub: '票据逾期 1 笔 · 宁桂精密上游供应商', chip: '橙色预警' },
  { id: 'chengyu', kind: '预警', sev: 'gold', title: '澄宇建材贸易', sub: '结算量环比 -35% · 疑似他行分流', chip: '黄色关注' },
  { id: 'hengrui', kind: '商机', sev: 'green', title: '衡瑞医药流通', sub: '授信 60 天后到期 · 建议本周启动续贷', chip: '续贷' },
  { id: 'jiahe', kind: '商机', sev: 'green', title: '嘉禾连锁餐饮', sub: '结算量环比 +28% · 存款与收单机会', chip: '结算上升' },
  { id: 'policy', kind: '政策', sev: 'blue', title: '制造业中长期贷款政策要点', sub: '技改与设备更新项目期限可至 10 年 · 需纳入项目清单', chip: '政策' },
];

const RULES = [
  { id: 'R1', text: '新增被执行信息且标的金额 ≥ 500 万', hit: true, ev: '法院公示 860 万' },
  { id: 'R2', text: '本行结算量连续 3 个月降幅 ≥ 50%', hit: true, ev: '本行结算 -62%' },
  { id: 'R3', text: '与本行贷款客户存在应收 / 担保传导关系', hit: true, ev: '晟禾应收 1,800 万 · 担保 500 万' },
  { id: 'R4', text: '主要股东股权出质或实际控制人变更', hit: false, ev: '近 12 个月无变更' },
  { id: 'R5', text: '欠税公示或被列为税务非正常户', hit: false, ev: '仅申报额下降' },
];

const CHECKS = ['查开工率：车间 / 门店实际运转情况，对照近期出货单', '近三月电费：调取电费单，与申报销售额交叉核对', '库存照片：分区拍照，标注品类与堆放时间', '应收台账：逐笔核对对晟禾及其他上游的往来余额'];

interface Opt { key: string; title: string; tone: 'green' | 'gold' | 'red'; grade: string; rel: string; relief: number; hurt: number }
const OPTS: Opt[] = [
  { key: 'a', title: '追加押品', tone: 'green', grade: '五级分类：维持关注类，覆盖率由 83% 提升至 100% 以上，具备回调正常类的条件', rel: '客户关系：影响低——以"补充增信、保障后续续贷"沟通，晟禾可接受', relief: 70, hurt: 25 },
  { key: 'b', title: '压降续贷', tone: 'gold', grade: '五级分类：关注类保持稳定，敞口由 2,000 万压降至 1,500 万，覆盖率升至 110%', rel: '客户关系：影响中——需集团层面沟通，可能推动其转向他行补足额度', relief: 60, hurt: 55 },
  { key: 'c', title: '提前收回', tone: 'red', grade: '五级分类：若触发客户流动性紧张，短期内存在迁徙至次级类的可能，须风险经理评估', rel: '客户关系：影响高——集团 4.5 亿全行业授信中本行份额 4%，主动退出后难以再进入', relief: 85, hurt: 90 },
];

const STEP_TITLES = ['信号来源', '规则叠加', '传导路径', '建议动作'];

function useSteps(total: number, running: boolean, token: number, gap = 800) {
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

function Transmission() {
  return (
    <div className="svgwrap">
      <svg viewBox="0 0 560 176" role="img" aria-label="风险传导路径">
        <defs>
          <linearGradient id="gRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e85d55" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
          <linearGradient id="gOrg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb570" /><stop offset="1" stopColor="#c2620f" /></linearGradient>
          <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#a9843a" /></linearGradient>
          <linearGradient id="gLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3272b" /><stop offset="1" stopColor="#e3a93c" /></linearGradient>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c3272b" /></marker>
        </defs>
        <g fontFamily="inherit">
          <rect x="8" y="56" width="150" height="62" rx="12" fill="url(#gRed)" />
          <text x="83" y="83" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">彩晟商贸</text>
          <text x="83" y="103" textAnchor="middle" fill="#ffe3e0" fontSize="10.5">被执行 860 万 · 结算 -62%</text>

          <line x1="160" y1="87" x2="200" y2="87" stroke="url(#gLine)" strokeWidth="3" markerEnd="url(#arr)" />
          <text x="180" y="44" textAnchor="middle" fill="#8e1b1b" fontSize="11.5" fontWeight="800">应收 1,800 万</text>
          <text x="180" y="132" textAnchor="middle" fill="#8c8478" fontSize="10">晟禾向彩晟供货</text>

          <rect x="204" y="56" width="150" height="62" rx="12" fill="url(#gOrg)" />
          <text x="279" y="83" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">晟禾食品集团</text>
          <text x="279" y="103" textAnchor="middle" fill="#fff3e6" fontSize="10.5">营收 18 亿 · 6 子公司</text>

          <line x1="356" y1="87" x2="396" y2="87" stroke="url(#gLine)" strokeWidth="3" markerEnd="url(#arr)" />
          <text x="376" y="44" textAnchor="middle" fill="#8e1b1b" fontSize="11.5" fontWeight="800">担保 500 万</text>
          <text x="376" y="132" textAnchor="middle" fill="#8c8478" fontSize="10">晟禾为彩晟担保</text>

          <rect x="400" y="56" width="152" height="62" rx="12" fill="url(#gGold)" />
          <text x="476" y="83" textAnchor="middle" fill="#3a2a08" fontSize="14" fontWeight="800">本行敞口 2,000 万</text>
          <text x="476" y="103" textAnchor="middle" fill="#5a4212" fontSize="10.5">正常类 → 拟关注类</text>

          <text x="280" y="164" textAnchor="middle" fill="#8c8478" fontSize="10.5">应收减值 + 代偿压力 → 晟禾偿债能力 → 本行贷款第一还款来源</text>
        </g>
      </svg>
    </div>
  );
}

export default function PostLoan() {
  const [sel, setSel] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [view, setView] = useState<'lin' | 'wang' | 'zhou'>('lin');
  const [done, setDone] = useState<boolean[]>(CHECKS.map(() => false));
  const [toast, setToast] = useState<string | null>(null);

  const running = sel === 'caisheng' && run > 0;
  const n = useSteps(STEP_TITLES.length, running, run);
  const finished = running && n > STEP_TITLES.length;
  const me = PERSONAS.find((p) => p.id === view)!;
  const cs = companyById('caisheng');

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const pick = (b: Brief) => {
    setSel(b.id);
    if (b.id === 'caisheng') setRun((r) => r + 1);
  };

  const stateOf = (i: number) => (i < n - 1 ? 'done' : i === n - 1 && n <= STEP_TITLES.length ? 'active' : 'pending');

  return (
    <div>
      <div className="page-h">
        <div>
          <h1><Sun size={20} style={{ verticalAlign: -3, marginRight: 6 }} />早会晨报 · 贷后风险哨兵</h1>
          <p>城东支行 · 预警只报规则命中，不报概率；每条建议均需人工复核。</p>
        </div>
        <div className="vsw"><span className="chip green"><i />AI 引擎 · 行内私有化</span></div>
      </div>

      <div className="pl-cols">
        {/* 左栏：晨报 */}
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />今日晨报</div><span className="card-s">3 预警 · 2 商机 · 1 政策</span></div>
          {(['预警', '商机', '政策'] as const).map((k) => (
            <div key={k}>
              <div className="sec-h">{k}</div>
              {BRIEF.filter((b) => b.kind === k).map((b) => (
                <div key={b.id} className={`li alert${sel === b.id ? ' sel' : ''}`} onClick={() => pick(b)}>
                  <div className={`sev ${b.sev}`} />
                  <div className="body">
                    <div className="t">{b.title}{b.id === 'caisheng' && <span className="pulse" style={{ display: 'inline-block', marginLeft: 8, verticalAlign: 'middle' }} />}</div>
                    <div className="s">{b.sub}</div>
                  </div>
                  <span className={`chip ${b.sev === 'gold' ? '' : b.sev}`}><i />{b.chip}</span>
                </div>
              ))}
            </div>
          ))}
          <p className="muted mt8">点击红色预警「彩晟商贸」查看哨兵推理过程。</p>
        </div>

        {/* 中栏：思考流 */}
        <div className="card fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h">
            <div className="card-t"><span className="dot" />哨兵思考流{running && !finished && <span className="pulse" />}</div>
            {finished && <button className="btn sm ghost" onClick={() => setRun((r) => r + 1)}><RotateCcw size={12} />重新分析</button>}
          </div>
          {!running && (
            <div className="think-empty">
              <div>
                <div className="ring"><ShieldAlert size={22} /></div>
                {sel && sel !== 'caisheng' ? <>该条目暂无新的推理更新。<br />点击左栏「彩晟商贸」查看完整传导分析。</> : <>等待选择预警……<br />哨兵将按「信号 → 规则 → 传导 → 动作」四步给出依据。</>}
              </div>
            </div>
          )}
          {running && (
            <div className="think">
              <div className="row-wrap"><span className="chip red"><i />{cs.name}</span><span className="chip"><i />{cs.relation}</span><span className="chip orange"><i />主办 {PERSONAS.find((p) => p.id === cs.owner)!.name}</span></div>
              {STEP_TITLES.map((t, i) => {
                const st = stateOf(i);
                if (st === 'pending') return null;
                return (
                  <div key={t} className={`step fade-in ${st}`}>
                    <div className="n">{st === 'done' ? <Check size={12} /> : i + 1}</div>
                    <div className="bd">
                      <div className="hd"><b>{t}</b>{st === 'active' && <span className="pulse" />}</div>
                      {i === 0 && (
                        <>
                          <p>汇聚四类信号，均为公开信息或本行内部数据，不使用征信查询。</p>
                          <div className="src">
                            <div className="it"><span className="ico"><Gavel size={12} /></span><div><b>法院公示</b><span>9 月 1 日新增被执行，标的 860 万，申请人为其上游供应商</span></div></div>
                            <div className="it"><span className="ico"><Landmark size={12} /></span><div><b>税务</b><span>增值税申报销售额连续 2 期下降，未列入欠税公示</span></div></div>
                            <div className="it"><span className="ico"><Newspaper size={12} /></span><div><b>舆情</b><span>本地社区平台出现「门店关停、员工讨薪」帖子 2 条</span></div></div>
                            <div className="it"><span className="ico"><Wallet size={12} /></span><div><b>本行结算</b><span>近三月结算量 -62%，对公存款余额降至 120 万</span></div></div>
                          </div>
                        </>
                      )}
                      {i === 1 && (
                        <>
                          <p>逐条比对贷后升级规则，命中即升级，不做概率估计。</p>
                          {RULES.map((r) => (
                            <div key={r.id} className={`rule ${r.hit ? 'hit' : 'miss'}`}>
                              <span className="mk">{r.hit ? <Check size={11} /> : <X size={11} />}</span>
                              <span className="rid">{r.id}</span><span>{r.text}</span><span className="ev">{r.ev}</span>
                            </div>
                          ))}
                          <div className="rule-sum"><ShieldAlert size={14} />命中 3/5 条升级规则 → 升级为红色预警，并触发传导分析</div>
                        </>
                      )}
                      {i === 2 && (
                        <>
                          <p>沿「应收 → 担保 → 本行敞口」追踪风险落点：彩晟本身无信贷敞口，落点在晟禾食品集团。</p>
                          <Transmission />
                        </>
                      )}
                      {i === 3 && (
                        <>
                          <p>面向三个角色分别给出动作，全部需人工确认后执行。</p>
                          <div className="acts">
                            <div className="a"><b>客户经理</b><span>今日安排彩晟现场检查，核实开工率、电费、库存与应收台账；同步暂停对彩晟的新增结算类授信。</span></div>
                            <div className="a"><b>晟禾主办</b><span>约见晟禾财务总监，核实对彩晟应收账龄与担保合同条款，确认是否已计提减值。</span></div>
                            <div className="a"><b>风险经理</b><span>启动晟禾贷款五级分类复核，评估追加押品 / 压降续贷 / 提前收回三种预案。</span></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {finished && <div className="ai-tag fade-in"><Sparkles size={11} /> 推理完成 · 输出已生成至右栏</div>}
            </div>
          )}
        </div>

        {/* 右栏：输出 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!finished && (
            <div className="card fade-in" style={{ animationDelay: '160ms' }}>
              <div className="card-h"><div className="card-t"><span className="dot" />输出</div><span className="card-s">视角：{me.name}</span></div>
              <div className="think-empty" style={{ minHeight: 160 }}><div>{running ? '哨兵推理中，输出即将生成……' : '选择预警后，此处生成检查清单、分类影响与处置建议。'}</div></div>
            </div>
          )}

          {finished && (
            <>
              <div className="card gold fade-in">
                <div className="card-h"><div className="card-t"><Camera size={14} />现场检查清单</div><span className="card-s">{done.filter(Boolean).length}/{CHECKS.length} 已勾选</span></div>
                {CHECKS.map((c, i) => (
                  <div key={c} className={`chk${done[i] ? ' done' : ''}`} onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}>
                    <span className="bx">{done[i] && <Check size={11} />}</span>{c}
                  </div>
                ))}
              </div>

              <div className="card fade-in" style={{ animationDelay: '80ms' }}>
                <div className="card-h"><div className="card-t"><Zap size={14} />对本户五级分类的影响</div><span className="card-s">晟禾食品集团 · 敞口 2,000 万</span></div>
                <div className="grade"><span className="g now">正常类</span><ArrowRight size={14} /><span className="g next">拟下调至关注类</span></div>
                <p className="small" style={{ color: 'var(--ink-2)' }}>依据：借款人对外担保对象被执行、主要经销商应收存在减值迹象，符合关注类定义中「影响还款的不利因素」。彩晟商贸为结算户，无信贷敞口，建议限制新增授信。</p>
                <div className="mbar"><span className="lab">敞口覆盖率</span><div className="bar gd"><i style={{ width: '83%' }} /></div><span className="val">83%</span></div>
                <div className="kv mt8">
                  <div className="row"><span>抵押物评估值（厂房）</span><span className="num">1,450 万</span></div>
                  <div className="row"><span>存款质押</span><span className="num">200 万</span></div>
                  <div className="row"><span>合计 / 敞口</span><span className="num">1,650 万 / 2,000 万</span></div>
                </div>
              </div>

              <div className="card fade-in" style={{ animationDelay: '160ms' }}>
                <div className="card-h"><div className="card-t"><BookOpen size={14} />三种处置建议</div><span className="card-s">对分类迁徙与客户关系的影响</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {OPTS.map((o) => (
                    <div key={o.key} className={`card opt ${o.tone}`}>
                      <h4>{o.title}<span className={`chip ${o.tone === 'gold' ? '' : o.tone}`}><i />{o.tone === 'green' ? '优先' : o.tone === 'gold' ? '备选' : '慎用'}</span></h4>
                      <p>{o.grade}</p>
                      <p>{o.rel}</p>
                      <div className="mbar"><span className="lab">风险缓释</span><div className="bar gr"><i style={{ width: `${o.relief}%` }} /></div><span className="val">{o.relief >= 80 ? '高' : o.relief >= 60 ? '中' : '低'}</span></div>
                      <div className="mbar"><span className="lab">关系影响</span><div className="bar rd"><i style={{ width: `${o.hurt}%` }} /></div><span className="val">{o.hurt >= 80 ? '高' : o.hurt >= 50 ? '中' : '低'}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              {true && (
                <div className="card blue fade-in">
                  <div className="card-h"><div className="card-t"><Factory size={14} />应收与担保代偿传导分析</div><span className="card-s">王志远视角</span></div>
                  <div className="kv">
                    <div className="row"><span>晟禾对彩晟应收</span><span className="num">1,800 万（占其应收总额 9%）</span></div>
                    <div className="row"><span>账龄结构</span><span className="num">6 个月内 700 万 · 6–12 个月 1,100 万</span></div>
                    <div className="row"><span>担保代偿上限</span><span className="num">500 万（连带责任）</span></div>
                    <div className="row"><span>全额减值 + 代偿后流动比率</span><span className="num">1.35 → 1.21</span></div>
                    <div className="row"><span>对本行贷款第一还款来源</span><span className="num">仍覆盖，安全边际收窄</span></div>
                  </div>
                  <p className="small mt8" style={{ color: 'var(--ink-2)' }}>关联提示：北岭铝材（宁桂上游）票据逾期与本事件无直接关联，但同日出现两条供应链信号，建议在宁桂授信报告的前置条件中一并说明。</p>
                </div>
              )}
              {true && (
                <div className="card purple fade-in">
                  <div className="card-h"><div className="card-t"><Factory size={14} />对晟禾集团授信的影响评估与处置预案</div><span className="card-s">周慧敏视角</span></div>
                  <div className="kv">
                    <div className="row"><span>集团全行业授信</span><span className="num">4.5 亿 · 本行份额 4%</span></div>
                    <div className="row"><span>集团结构</span><span className="num">6 子公司 + 2 隐性关联 · 3 家未开户</span></div>
                    <div className="row"><span>担保圈排查</span><span className="num">彩晟外另有 2 家经销商担保待核</span></div>
                  </div>
                  <div className="sec-h">处置预案</div>
                  <ul className="ul">
                    <li>一周内约见集团财务总监，核实对经销商担保总额与账龄。</li>
                    <li>推动 3 家未开户子公司在本行开户，提升集团资金流可见度。</li>
                    <li>续贷条件中加入「单一经销商应收占比 ≤ 15%、对外担保新增须报备」。</li>
                    <li>以追加押品为首选，压降续贷为备选，不建议提前收回。</li>
                  </ul>
                  <Link to="/scene/group" className="btn sm gold mt12" style={{ marginTop: 12 }}>去集团作战室 <ArrowRight size={12} /></Link>
                </div>
              )}

              <div className="card dark fade-in" style={{ animationDelay: '240ms' }}>
                <div className="card-h"><div className="card-t"><Send size={14} />推送复核</div><span className="ai-tag" style={{ color: '#fff8e8' }}><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span></div>
                <p className="small" style={{ color: 'rgba(255,248,232,.8)' }}>将本页检查清单、分类影响与处置建议打包推送给风险经理，附规则命中明细与信号来源。</p>
                <button className="btn gold mt12" style={{ marginTop: 12 }} onClick={() => setToast(`已推送至风险经理复核（模拟）· 发起人 ${me.name}`)}><Send size={14} />推送风险经理复核（模拟）</button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <div className="toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
