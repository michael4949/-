import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import type { Company } from '../../data/companies';
import { rng } from '../../lib/rng';
import { ActionBtns, type SystemHandler } from './ActionBtns';
import { clamp, fmtInt } from './text';

/** 混合类功能的专属结果块：F-KH-014 价值卡 / F-YX-003 组合对比与收益测算 / F-YX-004 情景沙盘（可编辑参数重算）。 */
interface Props { co: Company; seed: number; onSystem: SystemHandler; onToast: (m: string) => void }

export default function HybridExtras({ fid, ...p }: Props & { fid: string }) {
  if (fid === 'F-KH-014') return <ValueCard {...p} />;
  if (fid === 'F-YX-003') return <ComboAdvisor {...p} />;
  if (fid === 'F-YX-004') return <ScenarioSandbox {...p} />;
  return null;
}

/* ====================================================================== 客户价值卡 */
function ValueCard({ co, seed, onSystem }: Props) {
  const v = useMemo(() => {
    const r = rng((seed ^ 0x1234) >>> 0);
    const loan = co.exposure * 0.036, dep = co.deposit * 0.021, fee = co.settlement * 0.0015;
    const current = loan + dep + fee;
    const share = Math.round(14 + r() * 30);
    const target = Math.min(65, share + 12 + Math.round(r() * 14));
    const lift = target / share - 1;
    const potential = current * lift * (0.55 + r() * 0.3);
    const gapDep = co.deposit * lift * 0.8;
    const grade = potential / Math.max(1, current) > 0.6 ? 'A' : potential / Math.max(1, current) > 0.3 ? 'B+' : 'B';
    const opp = [...co.tags.slice(0, 2), '结算份额提升', co.exposure > 0 ? '主办行与资金归集' : '首次授信与代发扩面', '供应链融资'].slice(0, 4);
    const now = new Date(); const q = Math.floor(now.getMonth() / 3) + 1;
    const path = [
      { when: `Q${q}`, what: co.exposure > 0 ? '扩大结算与资金归集' : '首笔授信落地并开立结算主账户' },
      { when: q === 4 ? '明年 Q1' : `Q${q + 1}`, what: '现金管理 / 代发上线，份额提升至中间目标' },
      { when: q >= 3 ? '明年 Q2' : `Q${q + 2}`, what: '供应链融资落地，钱包份额达到目标值' },
    ];
    return { loan, dep, fee, current, share, target, potential, gapDep, grade, opp, path };
  }, [co, seed]);
  return (
    <div className="card gold fp-panel wide fade-in vc">
      <div className="fp-panel-h">
        <div className="t"><span className="ico dist"><Icons.Gem size={13} /></span><span>客户价值卡 · {co.name}</span></div>
        <span className="chip red"><i />价值评级 {v.grade}</span>
      </div>
      <div className="vc-tiles">
        <div className="tile"><span>当前综合贡献（年）</span><b className="num">{fmtInt(v.current)} <small>万</small></b><span>贷款 {fmtInt(v.loan)} · 存款 {fmtInt(v.dep)} · 中收 {fmtInt(v.fee)}</span></div>
        <div className="tile"><span>钱包份额</span><b className="num">{v.share}% <small>→ {v.target}%</small></b><span>本行结算 / 客户估算结算总量</span></div>
        <div className="tile"><span>潜在价值（新增年贡献）</span><b className="num green-text">+{fmtInt(v.potential)} <small>万</small></b><span>份额提升至 {v.target}% 的增量</span></div>
        <div className="tile"><span>提升空间</span><b className="num">{fmtInt(v.gapDep)} <small>万</small></b><span>存款潜力 · 份额 +{v.target - v.share} 个百分点</span></div>
      </div>
      <div className="vc-row">
        <div>
          <div className="vc-cap"><Icons.Sparkles size={12} /> 业务机会</div>
          <div className="fp-chips">{v.opp.map((o) => <span className="chip green" key={o}><i />{o}</span>)}</div>
        </div>
        <div>
          <div className="vc-cap"><Icons.Route size={12} /> 价值提升路径</div>
          <div className="vc-path">{v.path.map((s, i) => <div className="vc-step" key={i}><span className="n">{s.when}</span><span>{s.what}</span></div>)}</div>
        </div>
      </div>
      <ActionBtns ids={['combo', 'pricing', 'visit', 'marketing']} onSystem={onSystem} />
    </div>
  );
}

/* ====================================================================== 产品组合顾问 */
interface Prod { name: string; amt: number; usd?: boolean; term: string; price: string; rate: number; fee: number; derive: number; role: string }
function ComboAdvisor({ co, seed, onSystem }: Props) {
  const [sel, setSel] = useState<'rec' | 'alt'>('rec');
  const d = useMemo(() => {
    const r = rng((seed ^ 0x3c0b) >>> 0);
    const A = Math.max(500, co.exposure > 0 ? co.exposure : Math.round((co.settlement * 0.2) / 100) * 100);
    const rec: Prod[] = [
      { name: '固定资产贷款', amt: A * 1.4, term: '5 年', price: 'LPR5Y + 45BP ≈ 3.95%', rate: 0.0395, fee: 0, derive: 0.12, role: '扩产设备与厂房改造' },
      { name: '流动资金贷款', amt: A * 0.5, term: '1 年', price: 'LPR1Y + 60BP ≈ 3.60%', rate: 0.036, fee: 0, derive: 0.2, role: '原材料备货' },
      { name: '国内信用证', amt: A * 0.25, term: '6 个月', price: '开证费 0.15%', rate: 0, fee: 0.0015, derive: 0.2, role: '采购结算' },
      { name: '远期结汇', amt: Math.round((A * 0.3) / 7.1), usd: true, term: '3–12 个月', price: '点差约 35 pips', rate: 0, fee: 0.0012, derive: 0.05, role: '出口收汇避险' },
      { name: '出口发票融资 / 票据贴现', amt: A * 0.35, term: '90 天', price: '≈ 3.20%', rate: 0.032, fee: 0, derive: 0.1, role: '应收周转' },
    ];
    const alt: Prod[] = [
      { name: '流动资金贷款', amt: A * 1.0, term: '1 年', price: 'LPR1Y + 60BP ≈ 3.60%', rate: 0.036, fee: 0, derive: 0.2, role: '综合周转' },
      { name: '银行承兑汇票', amt: A * 0.4, term: '6 个月', price: '保证金 30% + 手续费 0.05%', rate: 0, fee: 0.0005, derive: 0.3, role: '采购支付' },
      { name: '商票贴现', amt: A * 0.3, term: '90 天', price: '≈ 3.20%', rate: 0.032, fee: 0, derive: 0.1, role: '应收变现' },
      { name: '结构性存款', amt: Math.max(100, co.deposit * 0.3), term: '3 个月', price: '预期 2.1%–2.6%', rate: 0, fee: 0.001, derive: 1, role: '沉淀资金增值' },
    ];
    const sum = (ps: Prod[]) => {
      const cny = (p: Prod) => (p.usd ? p.amt * 7.1 : p.amt);
      const interest = ps.reduce((s, p) => s + cny(p) * p.rate, 0);
      const fee = ps.reduce((s, p) => s + cny(p) * p.fee, 0);
      const deposit = ps.reduce((s, p) => s + cny(p) * p.derive, 0);
      return { interest, fee, deposit, total: interest + fee + deposit * 0.018 };
    };
    return { A, rec, alt, sRec: sum(rec), sAlt: sum(alt), mRec: Math.round(82 + r() * 10), mAlt: Math.round(68 + r() * 10), trigger: `实际排产低于计划 ${Math.round(60 + r() * 20)}% 时提示缩减流贷额度` };
  }, [co, seed]);
  const cur = sel === 'rec' ? d.sRec : d.sAlt;
  const Tbl = ({ ps, title, on, onPick }: { ps: Prod[]; title: string; on: boolean; onPick: () => void }) => (
    <div className={`cmb-box${on ? ' on' : ''}`}>
      <div className="cmb-h"><b>{title}</b><button className={`btn sm ${on ? 'gold' : 'ghost'}`} onClick={onPick}>{on ? <><Icons.Check size={12} />已采用</> : '采用此组合'}</button></div>
      <table className="tbl">
        <thead><tr><th>产品</th><th>金额</th><th>期限</th><th>参考价格</th><th>作用</th></tr></thead>
        <tbody>{ps.map((p) => <tr key={p.name}><td><b>{p.name}</b></td><td className="num">{p.usd ? `USD ${fmtInt(p.amt)} 万` : `${fmtInt(p.amt)} 万`}</td><td>{p.term}</td><td>{p.price}</td><td className="card-s">{p.role}</td></tr>)}</tbody>
      </table>
    </div>
  );
  return (
    <div className="card fp-panel wide fade-in cmb">
      <div className="fp-panel-h">
        <div className="t"><span className="ico dist"><Icons.Layers size={13} /></span><span>推荐组合 vs 备选组合 · {co.name}</span></div>
        <span className="chip iris"><i />基准额度 {fmtInt(d.A)} 万</span>
      </div>
      <div className="cmb-grid">
        <Tbl ps={d.rec} title={`推荐组合 · 风险匹配度 ${d.mRec} 分`} on={sel === 'rec'} onPick={() => setSel('rec')} />
        <Tbl ps={d.alt} title={`备选组合 · 风险匹配度 ${d.mAlt} 分`} on={sel === 'alt'} onPick={() => setSel('alt')} />
      </div>
      <div className="cmb-sum">
        <div className="vc-cap"><Icons.Calculator size={12} /> 综合收益测算（年）</div>
        <table className="tbl">
          <thead><tr><th>指标</th><th>推荐组合</th><th>备选组合</th><th>差异</th></tr></thead>
          <tbody>
            {([['利息收入', 'interest'], ['中间业务收入', 'fee'], ['派生日均存款', 'deposit'], ['综合收益（含存款 FTP）', 'total']] as Array<[string, keyof typeof d.sRec]>).map(([k, f]) => (
              <tr key={k}><td><b>{k}</b></td><td className="num">{fmtInt(d.sRec[f])} 万</td><td className="num">{fmtInt(d.sAlt[f])} 万</td><td className={`num ${d.sRec[f] >= d.sAlt[f] ? 'green-text' : 'red-text'}`}>{d.sRec[f] >= d.sAlt[f] ? '+' : ''}{fmtInt(d.sRec[f] - d.sAlt[f])} 万</td></tr>
            ))}
            <tr><td><b>风险匹配度</b></td><td className="num">{d.mRec} 分</td><td className="num">{d.mAlt} 分</td><td className="num green-text">+{d.mRec - d.mAlt} 分</td></tr>
          </tbody>
        </table>
        <div className="cmb-note">
          <span className="chip gold"><i />当前采用：{sel === 'rec' ? '推荐组合' : '备选组合'} · 综合收益 {fmtInt(cur.total)} 万 / 年</span>
          <span className="card-s">动态调整触发：{d.trigger}；收益与额度为参考测算，最终以行内审批与定价管理为准。</span>
        </div>
      </div>
      <ActionBtns ids={['marketing', 'pricing', 'visit', 'forward']} onSystem={onSystem} />
    </div>
  );
}

/* ====================================================================== 投融资沙盘 */
interface Params { total: number; own: number; rate: number; term: number; lease: number; ebitda: number; rev: number }
function ScenarioSandbox({ co, seed, onSystem, onToast }: Props) {
  const init = useMemo<Params>(() => {
    const r = rng((seed ^ 0x5a4d) >>> 0);
    const base = co.exposure > 0 ? co.exposure * 3.5 : co.settlement * 1.2;
    const total = clamp(Math.round(base / 100) * 100, 2000, 60000);
    return { total, own: 30, rate: Math.round((3.4 + r() * 0.6) * 100) / 100, term: 5, lease: Math.round((4.8 + r() * 0.8) * 10) / 10, ebitda: Math.round(12 + r() * 8), rev: Math.round((total * (1.2 + r() * 0.6)) / 100) * 100 };
  }, [co, seed]);
  const [p, setP] = useState<Params>(init);
  const set = (k: keyof Params, v: string) => setP((x) => ({ ...x, [k]: Number(v) || 0 }));
  const sc = useMemo(() => {
    const debt = p.total * (1 - p.own / 100);
    const cash = (p.rev * p.ebitda) / 100;
    const assets = p.total * 2.6;
    const lev = (extra: number) => ((extra / (assets + extra)) * 100);
    const loanSvc = (loan: number) => loan / Math.max(1, p.term) + (loan * p.rate) / 100;
    const irr = p.lease / 100; const leaseAnn = (x: number) => (irr > 0 ? (x * irr) / (1 - Math.pow(1 + irr, -3)) : x / 3);
    const A = { id: 'A', name: '情景 A', mix: `固定资产贷款 ${fmtInt(debt)} 万 · ${p.term} 年`, amt: debt, svc: loanSvc(debt), cost: p.rate, lev: lev(debt), note: '结构最简单，成本最低，需新增设备抵押 + 保证' };
    const bLoan = debt * 0.64, bLease = debt - bLoan;
    const B = { id: 'B', name: '情景 B', mix: `固贷 ${fmtInt(bLoan)} 万 + 设备融资租赁 ${fmtInt(bLease)} 万（3 年）`, amt: debt, svc: loanSvc(bLoan) + leaseAnn(bLease), cost: (bLoan * p.rate + bLease * p.lease) / debt, lev: lev(bLoan) + lev(bLease) * 0.5, note: '设备交付进度超前时的备选，租赁部分不占授信额度' };
    const cLoan = debt * 0.71, cEq = debt - cLoan;
    const C = { id: 'C', name: '情景 C', mix: `固贷 ${fmtInt(cLoan)} 万 + 产业基金股权 ${fmtInt(cEq)} 万`, amt: debt, svc: loanSvc(cLoan), cost: (cLoan * p.rate + cEq * 12) / debt, lev: lev(cLoan), note: `无固定还本压力，股权稀释约 ${(cEq / (p.total * 1.8) * 100).toFixed(1)}%，到位周期 6 个月以上` };
    const list = [A, B, C].map((s) => ({ ...s, dscr: s.svc > 0 ? cash / s.svc : 9 }));
    const ok = list.filter((s) => s.dscr >= 1.2);
    const best = (ok.length ? ok : list).reduce((m, s) => (ok.length ? (s.cost < m.cost ? s : m) : (s.dscr > m.dscr ? s : m)));
    return { list, best: best.id, cash, debt };
  }, [p]);
  const F: Array<[keyof Params, string, string, number]> = [
    ['total', '项目总投资', '万', 100], ['own', '自有资金比例', '%', 5], ['rate', '固贷参考利率', '%', 0.05], ['term', '固贷期限', '年', 1], ['lease', '租赁 IRR', '%', 0.1], ['ebitda', 'EBITDA 率', '%', 1], ['rev', '年新增收入', '万', 100],
  ];
  return (
    <div className="card fp-panel wide fade-in sb">
      <div className="fp-panel-h">
        <div className="t"><span className="ico trend"><Icons.Landmark size={13} /></span><span>投融资沙盘 · {co.name}</span></div>
        <div className="ap-tools">
          <span className="chip green"><i />推荐 {sc.best === 'A' ? '情景 A' : sc.best === 'B' ? '情景 B' : '情景 C'}</span>
          <button className="btn ghost sm" onClick={() => { setP(init); onToast('参数已恢复为系统取值'); }}><Icons.RotateCcw size={12} />恢复参数</button>
        </div>
      </div>
      <div className="sb-params">
        {F.map(([k, label, unit, step]) => (
          <label className="sb-p" key={k}><span>{label}</span><span className="fp-amount"><input className="fp-inp num" type="number" step={step} value={p[k]} onChange={(e) => set(k, e.target.value)} /><span className="unit">{unit}</span></span></label>
        ))}
      </div>
      <div className="sb-line"><span className="chip"><i />融资需求 {fmtInt(sc.debt)} 万</span><span className="chip"><i />增量经营现金流 {fmtInt(sc.cash)} 万 / 年</span><span className="card-s">修改任一参数即时重算三个情景，参数为参考取值，额度与审批以行内流程为准。</span></div>
      <div className="sb-wrap">
        <table className="tbl sb-tbl">
          <thead><tr><th>情景</th><th>融资结构</th><th>融资额</th><th>首年还本付息</th><th>DSCR</th><th>综合成本</th><th>负债率变动</th><th>说明</th></tr></thead>
          <tbody>
            {sc.list.map((s) => (
              <tr key={s.id} className={s.id === sc.best ? 'best' : ''}>
                <td><b>{s.name}</b>{s.id === sc.best && <span className="chip green" style={{ marginLeft: 6 }}><i />推荐</span>}</td>
                <td>{s.mix}</td><td className="num">{fmtInt(s.amt)} 万</td><td className="num">{fmtInt(s.svc)} 万</td>
                <td className={`num ${s.dscr >= 1.2 ? 'green-text' : 'red-text'}`}>{s.dscr.toFixed(2)}</td>
                <td className="num">{s.cost.toFixed(2)}%</td><td className="num">+{s.lev.toFixed(1)} pct</td><td className="card-s">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ActionBtns ids={['credit', 'pricing', 'finance', 'forward']} onSystem={onSystem} />
    </div>
  );
}
