import { createElement, useId, useImperativeHandle, useRef, type CSSProperties, type FormEvent, type ReactNode, type Ref } from 'react';
import './proposal.css';

/**
 * 银行正式营销方案书：文头 + 九个章节 + 附件清单。
 * - editing 为 true 时段落与单元格可直接编辑（contentEditable），修改处标黄（pd-mod）；
 * - 通过 ref.getHtml() 取得可导出为 Word 的 HTML；
 * - 打印样式见 proposal.css。
 */
export interface ProposalKV { k: string; v: string }
export interface ProposalNeed { t: string; p: string }
export interface ProposalGoal { k: string; v: string; note?: string }
export interface ProposalProduct { name: string; amount: string; term: string; pricing: string; access: string; dept: string; role?: string }
export interface ProposalTouch { when: string; channel: string; target: string; action: string; owner: string }
export interface ProposalEffectRow { k: string; v: string; note?: string }
export interface ProposalChartBar { name: string; v: number; label?: string }
export interface ProposalResource { item: string; dept: string; owner: string; due: string }
export interface ProposalApproval { role: string; name?: string; hint?: string }
export interface ProposalSections {
  overview: ProposalKV[]; overviewNote?: string;
  needs: ProposalNeed[]; needsNote?: string;
  goals: ProposalGoal[]; goalsNote?: string;
  products: ProposalProduct[]; productsNote?: string;
  touch: ProposalTouch[]; touchNote?: string;
  effect: { rows: ProposalEffectRow[]; chart: ProposalChartBar[]; chartTitle?: string; note?: string };
  risks: string[];
  resources: ProposalResource[]; resourcesNote?: string;
  attachments: string[];
}
export interface ProposalDocHandle { getHtml: () => string; root: () => HTMLDivElement | null }
export interface ProposalDocProps {
  title: string; no: string; customer: string; org: string; author: string; date: string;
  sections: ProposalSections; editing?: boolean; approvals?: ProposalApproval[]; secret?: string; kind?: string;
  ref?: Ref<ProposalDocHandle>;
}

/** 导出 Word 时随 HTML 一并带出的基础排版（Word 不识别渐变，仅保留边框与字体） */
const EXPORT_CSS = '<style>body{font-family:"SimSun","Songti SC",serif;font-size:12pt;color:#000;line-height:1.7}.pd-org{text-align:center;letter-spacing:.3em;font-weight:700}.pd-title{text-align:center;font-size:22pt;font-weight:900;letter-spacing:.1em;margin:6pt 0}.pd-kind{text-align:center;letter-spacing:.5em}.pd-meta{font-size:10pt}.pd-meta span{margin-right:18pt}.pd-rule{border-top:2pt solid #c3272b;margin:6pt 0 12pt}h3{font-size:14pt;margin:14pt 0 6pt}h3 small{font-weight:400;font-size:9pt}p{text-indent:2em;margin:0 0 6pt;text-align:justify}table{border-collapse:collapse;width:100%;margin:4pt 0 8pt}td,th{border:1pt solid #000;padding:3pt 5pt;font-size:10.5pt;vertical-align:top}.pd-sign{display:flex;gap:8pt}.pd-sign .box{flex:1;border:1pt solid #000;min-height:110pt;padding:6pt}.pd-sign .opinion span{display:block;border-bottom:1pt dashed #000;height:16pt}.pd-mod{background:#fff3b0}.pd-foot{font-size:9pt;margin-top:14pt}</style>';

type EdTag = 'p' | 'td' | 'th' | 'li' | 'div' | 'span';
/** 可编辑块：编辑态下 contentEditable，输入后自身加 pd-mod 标黄 */
function Ed({ as = 'p', editing, className, style, children }: { as?: EdTag; editing?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return createElement(as, {
    className, style,
    contentEditable: editing ? true : undefined,
    suppressContentEditableWarning: true,
    onInput: (e: FormEvent<HTMLElement>) => { e.currentTarget.classList.add('pd-mod'); },
  }, children);
}

/** 章节六的小图：纯 SVG 柱图（可随 HTML 一并导出） */
function MiniBars({ data, gid }: { data: ProposalChartBar[]; gid: string }) {
  const W = 520, H = 170, padL = 10, padR = 10, padT = 26, padB = 30;
  const max = Math.max(1, ...data.map((d) => d.v));
  const n = Math.max(1, data.length);
  const slot = (W - padL - padR) / n;
  const bw = Math.min(64, slot * 0.58);
  return (
    <svg className="pd-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="预期效果测算图">
      <defs>
        <linearGradient id={`${gid}-bar`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3a93c" /><stop offset=".55" stopColor="#c3272b" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
        <linearGradient id={`${gid}-bar2`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5fd3a0" /><stop offset="1" stopColor="#155e3e" /></linearGradient>
        <linearGradient id={`${gid}-base`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(120,100,60,.45)" /><stop offset="1" stopColor="rgba(120,100,60,.12)" /></linearGradient>
      </defs>
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={`url(#${gid}-base)`} strokeWidth="1.5" />
      {data.map((d, i) => {
        const h = Math.max(2, ((H - padT - padB) * d.v) / max);
        const x = padL + slot * i + (slot - bw) / 2;
        const y = H - padB - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx="5" fill={`url(#${gid}-${i % 2 === 0 ? 'bar' : 'bar2'})`} />
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#3a2a08">{d.label ?? d.v}</text>
            <text x={x + bw / 2} y={H - padB + 16} textAnchor="middle" fontSize="10.5" fill="#5f5850">{d.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

const ROLE_CLS: Record<string, string> = { 主打: '', 搭配: 'pair', 沉淀: 'dep', 融资: '', 结算: 'dep', 避险: 'pair', 服务: 'pair' };

export default function ProposalDoc({ title, no, customer, org, author, date, sections: s, editing = false, approvals, secret = '内部资料 · 妥善保管', kind = '营 销 方 案 书', ref }: ProposalDocProps) {
  const root = useRef<HTMLDivElement>(null);
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  useImperativeHandle(ref, () => ({
    getHtml: () => (root.current ? EXPORT_CSS + root.current.innerHTML : ''),
    root: () => root.current,
  }), []);
  const appr: ProposalApproval[] = approvals ?? [
    { role: '客户经理', name: author, hint: '编制并对数据来源与真实性负责' },
    { role: '支行（负责人）', hint: '审核营销目标、资源安排与团队分工' },
    { role: '分行公司业务部', hint: '审定产品组合、定价参考与合规口径' },
  ];
  const E = (props: { as?: EdTag; className?: string; style?: CSSProperties; children?: ReactNode }) => <Ed editing={editing} {...props} />;

  return (
    <div className="pd-wrap">
      {editing && <div className="pd-hint"><i /> 编辑模式：点击任意段落或单元格可直接修改，修改处以黄色标记；完成后点击「完成编辑」。</div>}
      <div className="pd" ref={root} data-editing={editing ? 'true' : 'false'}>
        <div className="pd-org"><E as="span">{org}</E></div>
        <div className="pd-title"><E as="span">{title}</E></div>
        <div className="pd-kind">{kind}</div>
        <div className="pd-meta"><span>编号：<b>{no}</b></span><span>密级：<b>{secret}</b></span><span>日期：<b>{date}</b></span></div>
        <div className="pd-rule" />
        <table className="pd-tbl pd-kv pd-headtbl"><tbody>
          <tr><td className="pd-k">客户名称</td><E as="td">{customer}</E><td className="pd-k">编制机构</td><E as="td">{org}</E></tr>
          <tr><td className="pd-k">编制人</td><E as="td">{author}</E><td className="pd-k">编制日期</td><E as="td">{date}</E></tr>
        </tbody></table>

        <h3>一、客户概况<small>数据来源：行内 CRM / 客户 360 与公开信息</small></h3>
        <table className="pd-tbl pd-kv"><tbody>
          {s.overview.map((r, i) => <tr key={i}><td>{r.k}</td><E as="td">{r.v}</E></tr>)}
        </tbody></table>
        {s.overviewNote && <E>{s.overviewNote}</E>}

        <h3>二、需求分析</h3>
        {s.needs.map((n, i) => <E key={i}><b>{i + 1}. {n.t}。</b>{n.p}</E>)}
        {s.needsNote && <E>{s.needsNote}</E>}

        <h3>三、营销目标</h3>
        <table className="pd-tbl"><thead><tr><th>目标指标</th><th className="num">目标值</th><th>说明</th></tr></thead><tbody>
          {s.goals.map((g, i) => <tr key={i}><E as="td">{g.k}</E><E as="td" className="num"><b>{g.v}</b></E><E as="td">{g.note ?? '—'}</E></tr>)}
        </tbody></table>
        {s.goalsNote && <E>{s.goalsNote}</E>}

        <h3>四、产品组合与方案要素</h3>
        <table className="pd-tbl"><thead><tr><th>产品</th><th>额度 / 规模</th><th>期限</th><th>定价参考</th><th>准入要点</th><th>责任部门</th></tr></thead><tbody>
          {s.products.map((p, i) => (
            <tr key={i}>
              <E as="td"><b>{p.name}</b>{p.role && <span className={`pd-role ${ROLE_CLS[p.role] ?? ''}`}>{p.role}</span>}</E>
              <E as="td">{p.amount}</E><E as="td">{p.term}</E><E as="td">{p.pricing}</E><E as="td">{p.access}</E><E as="td">{p.dept}</E>
            </tr>
          ))}
        </tbody></table>
        <E>{s.productsNote ?? '以上额度、期限与定价均为方案参考值，最终以行内授信审批与产品准入结论为准；本方案不构成对客户的任何承诺。'}</E>

        <h3>五、触达策略与时间计划</h3>
        <table className="pd-tbl"><thead><tr><th>时间</th><th>渠道</th><th>触达对象</th><th>动作与要点</th><th>责任人</th></tr></thead><tbody>
          {s.touch.map((t, i) => <tr key={i}><E as="td"><b>{t.when}</b></E><E as="td">{t.channel}</E><E as="td">{t.target}</E><E as="td">{t.action}</E><E as="td">{t.owner}</E></tr>)}
        </tbody></table>
        {s.touchNote && <E>{s.touchNote}</E>}

        <h3>六、预期效果测算<small>前端确定性测算 · 不构成收益承诺</small></h3>
        <div className="pd-eff">
          <table className="pd-tbl"><thead><tr><th>指标</th><th className="num">测算值</th><th>口径</th></tr></thead><tbody>
            {s.effect.rows.map((r, i) => <tr key={i}><E as="td">{r.k}</E><E as="td" className="num"><b>{r.v}</b></E><E as="td">{r.note ?? '—'}</E></tr>)}
          </tbody></table>
          <div className="pd-chart-box"><b>{s.effect.chartTitle ?? '效果测算图'}</b><MiniBars data={s.effect.chart} gid={gid} /></div>
        </div>
        {s.effect.note && <E>{s.effect.note}</E>}

        <h3>七、风险与合规提示</h3>
        <ol className="pd-list">{s.risks.map((r, i) => <E key={i} as="li">{r}</E>)}</ol>

        <h3>八、资源需求与分工</h3>
        <table className="pd-tbl"><thead><tr><th>事项</th><th>牵头部门</th><th>责任人</th><th>时限</th></tr></thead><tbody>
          {s.resources.map((r, i) => <tr key={i}><E as="td">{r.item}</E><E as="td">{r.dept}</E><E as="td">{r.owner}</E><E as="td">{r.due}</E></tr>)}
        </tbody></table>
        {s.resourcesNote && <E>{s.resourcesNote}</E>}

        <h3>九、审批意见</h3>
        <div className="pd-sign">
          {appr.map((a, i) => (
            <div className="box" key={i}>
              <b>{a.role}</b>
              {a.hint && <span className="hint">{a.hint}</span>}
              <div className="opinion">意见：<span /><span /></div>
              <div className="line"><span>签字：<em>{a.name ?? '　　　　'}</em></span><span>日期：　　年　月　日</span></div>
            </div>
          ))}
        </div>

        <h3>附件清单</h3>
        <ol className="pd-list">{s.attachments.map((a, i) => <E key={i} as="li">{a}</E>)}</ol>

        <div className="pd-foot"><span>{org} · {no}</span><span>AI 辅助生成 · 经人工复核并履行审批后方可对外使用</span></div>
      </div>
    </div>
  );
}
