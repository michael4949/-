import { Link } from 'react-router-dom';
import { ShieldAlert, ClipboardList, Calculator, FileCheck2, Network, LayoutDashboard, ArrowRight, Building2, Factory, Store, Boxes, Sparkles } from 'lucide-react';
import { PERSONAS } from '../data/personas';
import { PRODUCTS } from '../data/products';
import { companyById } from '../data/companies';
import '../scenes/scenes.css';

type Tone = 'red' | 'gold' | 'green' | 'blue' | 'purple' | 'dark';
interface Node { time: string; cap: string; title: string; persona: string; story: string; products: string[]; to: string; tone: Tone; Icon: typeof ShieldAlert }

const NODES: Node[] = [
  { time: '08:30', cap: '早会', title: '早会晨报 · 贷后哨兵', persona: 'lin', tone: 'red', Icon: ShieldAlert, to: '/scene/postloan', products: ['P07', 'P11'],
    story: '晨报第一条就是红的：彩晟商贸新增被执行 860 万、本行结算量三个月掉了 62%。哨兵命中 3/5 条升级规则，把风险顺着应收与担保传到了晟禾食品集团。' },
  { time: '09:30', cap: '拜访', title: '尽调拜访准备与陪练', persona: 'lin', tone: 'gold', Icon: ClipboardList, to: '/scene/visit', products: ['P02', 'P10', 'P09'],
    story: '宁桂精密两周前首次申请授信，今天二次尽调。小雨让 AI 出一页准备单：近况、需求、开场三问、异议话术与礼仪卡，先陪练一遍，再和王志远双人上门。' },
  { time: '14:00', cap: '午后', title: '财报诊断', persona: 'wang', tone: 'green', Icon: Calculator, to: '/scene/fin', products: ['P03', 'P04'],
    story: '宁桂三表进场：其他应收款突增 1,900 万待核实，出口收汇 30% 带出汇率敞口。诊断把复算结果、异常项与追问清单一次列齐。' },
  { time: '15:00', cap: '报告', title: '授信报告工作台', persona: 'wang', tone: 'blue', Icon: FileCheck2, to: '/scene/credit', products: ['P06', 'P05'],
    story: '报告自动成稿，但早上的预警被写进了前置条件：上游北岭铝材票据逾期，宁桂供应链稳定性须补充说明并设置放款条件。' },
  { time: '17:00', cap: '集团', title: '集团作战室', persona: 'zhou', tone: 'purple', Icon: Network, to: '/scene/group', products: ['P08', 'P02'],
    story: '晟禾集团 6 家子公司 + 2 家隐性关联、3 家未开户。彩晟的风险传导到集团层面，作战室给出敞口覆盖、担保圈核查与联动开户方案。' },
  { time: '18:00', cap: '复盘', title: '主管复盘', persona: 'huang', tone: 'dark', Icon: LayoutDashboard, to: '/', products: ['P14', 'P12'],
    story: '行长在驾驶舱看全天：一条预警、三家客户、两个决策点。团队产能与组合风险摆在同一张沙盘上，明天早会的题目已经出来了。' },
];

interface CoCard { id: string; tone: 'red' | 'gold' | 'green' | 'blue' | 'purple' | ''; ico: 'red' | 'gold' | 'green' | 'orange' | 'purple'; Icon: typeof Building2; role: string; facts: string[] }
const CO: CoCard[] = [
  { id: 'ninggui', tone: 'gold', ico: 'gold', Icon: Factory, role: '授信申请人 · 首次授信',
    facts: ['本行存量结算户，两周前首次申请授信', '已签署征信授权，待实地调查', '获某新能源车企定点，SOP 后年供货约 1.2 亿', '出口收汇占比 30%，有汇率避险需求'] },
  { id: 'shenghe', tone: 'purple', ico: 'purple', Icon: Building2, role: '受传导方 · 集团客户',
    facts: ['本行 2,000 万贷款客户，营收 18 亿', '6 家子公司 + 2 家隐性关联', '3 家子公司尚未在本行开户', '对彩晟应收 1,800 万并担保 500 万'] },
  { id: 'caisheng', tone: 'red', ico: 'red', Icon: Store, role: '预警源头 · 结算户',
    facts: ['晟禾区域经销商，本行结算户', '新增被执行 860 万', '近三月本行结算量下降 62%', '风险经应收与担保向晟禾传导'] },
  { id: 'beiling', tone: '', ico: 'orange', Icon: Boxes, role: '授信前置条件 · 宁桂上游',
    facts: ['宁桂精密的铝材供应商', '本行贷款客户，敞口 800 万', '票据逾期 1 笔', '成为宁桂授信报告的前置说明项'] },
];

const persona = (id: string) => PERSONAS.find((p) => p.id === id)!;
const product = (id: string) => PRODUCTS.find((p) => p.id === id)!;

export default function Scenes() {
  return (
    <div>
      <div className="page-h">
        <div><h1>一天的故事线</h1><p>六个时刻、四家企业、四位角色——用一条预警串起睿衡的全部产品。</p></div>
        <span className="ai-tag"><Sparkles size={12} /> 演示数据均为虚构 · 场景可独立进入</span>
      </div>

      <div className="hero fade-in">
        <div className="row-wrap"><span className="chip red"><i />主线</span><span className="chip"><i />2026-09-05 · 城东支行</span></div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>一条预警贯穿全天</h2>
        <p className="small" style={{ color: 'var(--ink-2)', marginTop: 4, maxWidth: 760 }}>
          彩晟商贸出事，风险沿应收与担保传到晟禾集团；北岭铝材的票据逾期变成宁桂精密授信的前置条件；傍晚，全部线索汇入主管的决策沙盘。
          每一步都由客户经理主导、AI 提供依据——哨兵只给规则命中，不给概率。
        </p>
        <div className="sc-flow">
          <span className="node red">彩晟商贸出事</span><span className="arrow"><ArrowRight size={14} /></span>
          <span className="node orange">晟禾集团受影响</span><span className="arrow"><ArrowRight size={14} /></span>
          <span className="node gold">宁桂精密授信前置条件</span><span className="arrow"><ArrowRight size={14} /></span>
          <span className="node dark">主管决策沙盘</span>
        </div>
      </div>

      <div className="tl">
        {NODES.map((n, i) => {
          const p = persona(n.persona);
          const card = n.tone === 'dark' ? 'card dark' : `card ${n.tone}`;
          return (
            <div className="tl-row fade-in" key={n.time} style={{ animationDelay: `${i * 90}ms` }}>
              <div className="tl-time num">{n.time}<small>{n.cap}</small></div>
              <div className="tl-axis"><div className={`tl-dot ${n.tone}`} /></div>
              <div className={card}>
                <div className="sc-card">
                  <div>
                    <div className="who">
                      <div className="pav">{p.avatar}</div>
                      <div><b>{p.name}</b><br /><span>{p.title} · {p.years} · 主视角</span></div>
                    </div>
                    <h3><n.Icon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />{n.title}</h3>
                    <p className="story">{n.story}</p>
                    <div className="row-wrap mt8">
                      {n.products.map((pid) => { const pr = product(pid); return <span key={pid} className={`chip ${pr.tone}`}><i />{pr.name}</span>; })}
                    </div>
                  </div>
                  <div className="act">
                    <div className="idx num">0{i + 1}</div>
                    <Link to={n.to} className={`btn${n.tone === 'dark' ? ' gold' : ''}`}>进入场景 <ArrowRight size={14} /></Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sec-h">四家主角企业</div>
      <div className="grid g4">
        {CO.map((c, i) => {
          const co = companyById(c.id);
          return (
            <div key={c.id} className={`card co-card fade-in ${c.tone}`} style={{ animationDelay: `${300 + i * 80}ms` }}>
              <div className="co-h">
                <div className={`co-ico ${c.ico}`}><c.Icon size={18} /></div>
                <div><b>{co.name}</b><span>{co.industry} · {co.district} · 主办 {persona(co.owner).name}</span></div>
              </div>
              <span className="role">{c.role}</span>
              <ul className="ul">{c.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="kv mt12">
                <div className="row"><span>本行敞口</span><span className="num">{co.exposure ? `${co.exposure.toLocaleString()} 万` : '无'}</span></div>
                <div className="row"><span>本行存款</span><span className="num">{co.deposit.toLocaleString()} 万</span></div>
                <div className="row"><span>年结算量</span><span className="num">{co.settlement.toLocaleString()} 万</span></div>
              </div>
              <div className="row-wrap mt8">{co.tags.map((t) => <span key={t} className={`chip ${co.risk === 'red' ? 'red' : co.risk === 'orange' ? 'orange' : co.risk === 'green' ? 'green' : ''}`}><i />{t}</span>)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
