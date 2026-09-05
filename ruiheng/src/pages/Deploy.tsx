import { useState } from 'react';
import { Icon } from '../components/Shell';
import './pages.css';

/* ---------- 数据接入表 ---------- */
type Cat = '公开' | '行内' | '授权';
interface DataRow { cat: Cat; src: string; provider: string; grade: string; ctx: string; ctxOk: 'ok' | 'part' | 'no'; log: string; logOk: 'ok' | 'part' | 'no' }
const DATA_ROWS: DataRow[] = [
  { cat: '公开', src: '工商登记、司法涉诉、行政处罚', provider: '行内已采购数据商 / 公开渠道', grade: 'L1 公开', ctx: '允许（结构化摘要）', ctxOk: 'ok', log: '允许', logOk: 'ok' },
  { cat: '公开', src: '行业研报、宏观指标、舆情', provider: '行内研究平台 / 公开渠道', grade: 'L1 公开', ctx: '允许', ctxOk: 'ok', log: '允许', logOk: 'ok' },
  { cat: '行内', src: '信贷系统：授信、用信、五级分类', provider: '行方', grade: 'L3 敏感', ctx: '仅脱敏字段 · 会话内', ctxOk: 'part', log: '不落日志 · 不可导出', logOk: 'no' },
  { cat: '行内', src: 'CRM：客户、联系人、拜访记录', provider: '行方', grade: 'L3 敏感', ctx: '仅脱敏字段', ctxOk: 'part', log: '摘要可导出（脱敏）', logOk: 'part' },
  { cat: '行内', src: '核心账务：结算流水、余额', provider: '行方', grade: 'L4 高敏', ctx: '仅聚合指标，不含明细', ctxOk: 'part', log: '不落日志 · 不可导出', logOk: 'no' },
  { cat: '行内', src: 'ECIF：客户主数据、关联关系', provider: '行方', grade: 'L3 敏感', ctx: '仅脱敏字段', ctxOk: 'part', log: '不落日志', logOk: 'no' },
  { cat: '行内', src: '影像：合同、发票、财报扫描件', provider: '行方', grade: 'L3 敏感', ctx: 'OCR 后结构化字段', ctxOk: 'part', log: '不落日志 · 不可导出', logOk: 'no' },
  { cat: '授权', src: '客户财务报表、审计报告', provider: '客户授权提供', grade: 'L3 敏感', ctx: '允许（会话内）', ctxOk: 'ok', log: '结果可导出 · 标注 AI 生成', logOk: 'part' },
  { cat: '授权', src: '员工使用记录、陪练成绩', provider: '员工知情同意', grade: 'L2 内部', ctx: '仅本人画像', ctxOk: 'part', log: '不可导出 · 本人可查', logOk: 'no' },
];
const CAT_TONE: Record<Cat, string> = { 公开: 'green', 行内: 'red', 授权: 'blue' };

/* ---------- 模型清单 ---------- */
const MODELS = [
  { type: '规则引擎', tone: 'gold', use: '合规检查清单、五级分类要素、预警阈值、报告完整性校验', who: '行方风险 / 合规部门审定规则；供应商负责实现', how: '规则回归测试 + 行方签字确认' },
  { type: '统计模型', tone: 'blue', use: '商机概率、流失预警、现金流预测、行业周期指标', who: '行方数据 / 风险部门回测；供应商提供模型说明书', how: '历史样本回测、稳定性监控、定期重估' },
  { type: 'LLM 生成', tone: 'purple', use: '报告起草、话术、纪要、制度问答、陪练对话', who: '供应商 + 行方联合评测；一线双人复核', how: '评测集、幻觉率抽检、内容标识、复核采纳率' },
];

/* ---------- 监管对照 ---------- */
const REGS = [
  { name: '生成式人工智能服务管理暂行办法', req: '训练数据合法、内容标识、安全评估（面向公众服务）、投诉机制', act: '仅面向行内员工内部使用，不面向公众；AI 输出显式标识；模型可插拔，选用已完成备案的国产模型', who: '供应商（产品） + 行方（选型）' },
  { name: '人工智能生成合成内容标识办法', req: '生成合成内容显式标识与隐式标识', act: '所有 AI 生成文本带"AI 生成"显式标识；导出文件写入元数据隐式标识', who: '供应商' },
  { name: '互联网信息服务深度合成管理规定', req: '深度合成服务显著标识、不得用于违法用途', act: '不做人脸、声纹、形象合成；仅文本生成并标识', who: '供应商' },
  { name: '银行保险机构数据安全管理办法', req: '数据分类分级、最小必要、安全评估、访问控制', act: '数据分级表、只读旁路、L4 数据不进模型明细、审计日志、统一身份认证', who: '行方（分级） + 供应商（执行）' },
  { name: '银行保险机构信息科技外包风险监管办法', req: '外包风险评估、供应商尽调、集中度与退出机制', act: '供应商准入尽调材料包、源代码托管、退出与数据销毁方案', who: '行方（外包管理） + 供应商（配合）' },
  { name: 'JR/T 0221 人工智能算法金融应用评价规范', req: '算法安全性、可解释性、精准性、性能评价', act: '模型清单与验证责任、评测集、可解释性说明、人机复核链', who: '行方（评价） + 供应商（材料）' },
  { name: '流动资金贷款管理办法', req: '贷前调查、贷时审查、贷后管理；需求测算与受托支付', act: '授信工作台仅辅助起草，需求测算按办法公式确定性计算，结论由人工复核与审批', who: '行方（授信决策）' },
  { name: '商业银行金融资产风险分类办法', req: '分类标准、逾期天数、交叉违约、重组资产', act: '贷后哨兵仅提示分类信号，不替代行内分类与审批', who: '行方' },
  { name: '征信业管理条例', req: '查询授权、用途限制、信息安全', act: '不接入征信明细，仅引用行内已授权查询结果的摘要', who: '行方' },
];

const RESP = [
  { t: '供应商责任', tone: 'red', items: ['应用层安全与漏洞修复', 'AI 生成内容标识与留痕', '模型可插拔与本地推理实现', '源代码托管、SBOM 与退出方案', '不采集、不外传任何行内数据'] },
  { t: '行方责任', tone: 'gold', items: ['数据分类分级与访问授权', '模型选型与备案核对', '规则口径与阈值审定', '授信决策、分类与审批结论', '员工告知与考核用途配置'] },
  { t: '共同责任', tone: 'green', items: ['评测集建设与幻觉率抽检', '双人复核流程落地', '监管对照表定期更新（需法务复核）', 'POC 验收口径与数据销毁', '安全事件联合响应'] },
];

/* ---------- SVG 架构图 ---------- */
function Box({ x, y, w, h, fill, title, sub, stroke = 'rgba(120,100,60,.25)', dash }: { x: number; y: number; w: number; h: number; fill: string; title: string; sub?: string; stroke?: string; dash?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeDasharray={dash ? '6 4' : undefined} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize={12} fontWeight={800} fill="#1e1b16">{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize={10} fill="#5f5850">{sub}</text>}
    </g>
  );
}
function Arrow({ d, label, lx, ly }: { d: string; label?: string; lx?: number; ly?: number }) {
  return (
    <g>
      <path d={d} fill="none" stroke="url(#gLine)" strokeWidth={2} markerEnd="url(#arr)" />
      {label && <text x={lx} y={ly} fontSize={10} fill="#8c8478" textAnchor="middle">{label}</text>}
    </g>
  );
}
function ArchDiagram() {
  const SRC = ['信贷系统', 'CRM', '核心账务', 'ECIF', '影像系统'];
  return (
    <svg className="arch" viewBox="0 0 1000 400" role="img" aria-label="私有化部署架构图">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c9a24d" /></marker>
        <linearGradient id="gLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#c3272b" /><stop offset="100%" stopColor="#c9a24d" /></linearGradient>
        <linearGradient id="gFrame" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff8e6" stopOpacity={0.8} /><stop offset="100%" stopColor="#eafaf1" stopOpacity={0.7} /></linearGradient>
        <linearGradient id="gApp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="50%" stopColor="#fff1e4" /><stop offset="100%" stopColor="#ecf8f3" /></linearGradient>
        <linearGradient id="gModel" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f5eeff" /><stop offset="60%" stopColor="#e6d6ff" /><stop offset="100%" stopColor="#f1e8ff" /></linearGradient>
        <linearGradient id="gRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff1ef" /><stop offset="60%" stopColor="#ffd9d6" /><stop offset="100%" stopColor="#ffe9d1" /></linearGradient>
        <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff8e6" /><stop offset="60%" stopColor="#f7e7b8" /><stop offset="100%" stopColor="#fbefd8" /></linearGradient>
        <linearGradient id="gGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#eafaf1" /><stop offset="60%" stopColor="#c9efdc" /><stop offset="100%" stopColor="#e6f5ea" /></linearGradient>
        <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#eef4ff" /><stop offset="60%" stopColor="#d9e6ff" /><stop offset="100%" stopColor="#eaf0ff" /></linearGradient>
        <linearGradient id="gWhite" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} /><stop offset="100%" stopColor="#fff7ec" stopOpacity={0.9} /></linearGradient>
      </defs>

      {/* 私有化边界 */}
      <rect x={222} y={10} width={520} height={380} rx={18} fill="url(#gFrame)" stroke="#c9a24d" strokeDasharray="8 5" />
      <text x={240} y={30} fontSize={11} fontWeight={800} fill="#9c7a2e">行内 GPU 一体机 / 行内云 · 私有化部署边界 · 运行期无外联</text>

      {/* 应用层 */}
      <rect x={240} y={42} width={484} height={150} rx={14} fill="url(#gApp)" stroke="rgba(195,39,43,.35)" />
      <text x={256} y={62} fontSize={13} fontWeight={900} fill="#c3272b">睿衡应用层</text>
      <text x={720} y={62} fontSize={10} fill="#8c8478" textAnchor="end">14 个智能产品 · 6 个示范场景</text>
      <Box x={256} y={74} w={142} h={44} fill="url(#gRed)" title="智能产品" sub="获客 / 授信 / 贷后 / 陪练…" />
      <Box x={410} y={74} w={148} h={44} fill="url(#gGold)" title="人机复核链" sub="AI 起草 → 双人复核" />
      <Box x={570} y={74} w={140} h={44} fill="url(#gGreen)" title="检索与编排" sub="规则引擎 · 统计模型" />
      <Box x={256} y={130} w={222} h={44} fill="url(#gBlue)" title="内容标识 · 留痕 · 审计埋点" sub="显式 + 隐式标识" />
      <Box x={490} y={130} w={220} h={44} fill="url(#gWhite)" title="只读数据访问层" sub="脱敏视图 · 不回写 · 不缓存明细" />

      {/* 模型层 */}
      <rect x={240} y={222} width={484} height={150} rx={14} fill="url(#gModel)" stroke="rgba(155,93,229,.4)" />
      <text x={256} y={242} fontSize={13} fontWeight={900} fill="#6d28d9">国产模型可插拔</text>
      <text x={720} y={242} fontSize={10} fill="#8c8478" textAnchor="end">按行方选型切换 · 权重不出行</text>
      <Box x={256} y={256} w={140} h={46} fill="url(#gWhite)" title="DeepSeek" sub="已备案 · 本地推理" />
      <Box x={412} y={256} w={140} h={46} fill="url(#gWhite)" title="通义" sub="已备案 · 本地推理" />
      <Box x={568} y={256} w={142} h={46} fill="url(#gWhite)" title="行内自研" sub="行方模型接入" />
      <Box x={256} y={316} w={454} h={40} fill="url(#gGold)" title="GPU 一体机 / 行内云 GPU 资源池" sub="推理本地化 · 统一模型网关 · 可灰度切换" />
      <Arrow d="M482,222 L482,196" label="推理调用（本地）" lx={545} ly={212} />

      {/* 左侧：入口 / 认证 / 审计 */}
      <Box x={20} y={62} w={176} h={64} fill="url(#gRed)" title="行内 OA / 移动展业" sub="统一入口 · 嵌入工作台" />
      <Arrow d="M196,94 L238,94" label="单点进入" lx={217} ly={86} />
      <Box x={20} y={168} w={176} h={58} fill="url(#gBlue)" title="统一身份认证" sub="行内 IAM · 岗位权限" />
      <Arrow d="M196,197 L218,197 L218,150 L238,150" label="鉴权" lx={214} ly={140} />
      <Box x={20} y={262} w={176} h={58} fill="url(#gGreen)" title="审计日志" sub="行内日志平台 · 只写" />
      <Arrow d="M240,170 L212,170 L212,291 L198,291" label="留痕" lx={228} ly={240} />

      {/* 右侧：只读旁路数据源 */}
      <text x={870} y={40} fontSize={11} fontWeight={800} fill="#8e1b1b" textAnchor="middle">只读旁路 · 脱敏视图 · 不回写</text>
      {SRC.map((s, i) => {
        const y = 52 + i * 62;
        return (
          <g key={s}>
            <Box x={776} y={y} w={190} h={44} fill={i % 2 ? 'url(#gGold)' : 'url(#gGreen)'} title={s} sub="行内系统 · 只读账号" />
            <Arrow d={`M776,${y + 22} L750,${y + 22} L750,152 L726,152`} />
          </g>
        );
      })}
      <text x={870} y={378} fontSize={10} fill="#8c8478" textAnchor="middle">数据库只读账号 / 视图 / 文件交换区三选一</text>
    </svg>
  );
}

export default function Deploy() {
  const [ext, setExt] = useState<number | null>(null);
  const selfCheck = () => {
    try {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const n = entries.filter((e) => { try { return new URL(e.name).origin !== location.origin; } catch { return false; } }).length;
      setExt(n);
    } catch { setExt(0); }
  };

  return (
    <div>
      <div className="page-h">
        <div>
          <h1><span className="iris-text">部署 · 数据 · 合规</span></h1>
          <p>私有化、只读旁路、国产模型可插拔、人机复核；数据不出行、运行期无外联</p>
        </div>
        <div className="row"><span className="chip green"><i />私有化部署</span><span className="chip"><i />国产模型可插拔</span><span className="chip red"><i />运行期网络请求：0</span></div>
      </div>

      <div className="card">
        <div className="card-h"><div className="card-t"><span className="dot" />私有化架构图</div><span className="card-s">行内 GPU 一体机 / 行内云 → 模型层 → 应用层 → 只读旁路 → 行内 OA / 移动展业 → 认证 / 审计</span></div>
        <ArchDiagram />
      </div>

      <div className="card sec">
        <div className="card-h"><div className="card-t"><span className="dot" />数据接入表</div><span className="card-s">分级由行方数据管理部门最终审定</span></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>数据类别</th><th>数据源</th><th>提供方</th><th>分级</th><th>可否进入模型上下文</th><th>可否进入日志与导出</th></tr></thead>
            <tbody>
              {DATA_ROWS.map((r, i) => (
                <tr key={i}>
                  <td><span className={`chip ${CAT_TONE[r.cat]}`}><i />{r.cat}</span></td>
                  <td>{r.src}</td><td>{r.provider}</td><td><b>{r.grade}</b></td>
                  <td className={r.ctxOk}>{r.ctx}</td><td className={r.logOk}>{r.log}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g2 sec">
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />模型清单与验证责任</div></div>
          <table className="tbl">
            <thead><tr><th>类型</th><th>用途</th><th>验证责任方</th><th>验证方式</th></tr></thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.type}><td><span className={`chip ${m.tone}`}><i />{m.type}</span></td><td>{m.use}</td><td>{m.who}</td><td>{m.how}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="note" style={{ marginTop: 10 }}>数字类输出（比率、额度、定价）由规则引擎确定性计算；LLM 只负责起草与解释，不产生最终数值结论。</div>
        </div>
        <div className="card gold">
          <div className="card-h"><div className="card-t"><span className="dot" />人机复核链</div><span className="card-s">任何 AI 输出都不直接进入信贷系统</span></div>
          <div className="flow">
            <div className="node" style={{ background: 'var(--g-purple-soft)' }}><b><Icon name="Bot" size={13} /> AI 起草</b><p>生成初稿并标注"需核实"项、引用来源</p><span className="who">本机模型</span></div>
            <div className="arrow"><Icon name="ChevronRight" size={18} /></div>
            <div className="node" style={{ background: 'var(--g-blue-soft)' }}><b><Icon name="UserCheck" size={13} /> 客户经理核实</b><p>逐项核实标注、补充事实、修改文本</p><span className="who">第一人</span></div>
            <div className="arrow"><Icon name="ChevronRight" size={18} /></div>
            <div className="node" style={{ background: 'var(--g-green-soft)' }}><b><Icon name="Users" size={13} /> 双人复核确认</b><p>复核人独立确认，留痕采纳 / 驳回理由</p><span className="who">第二人</span></div>
            <div className="arrow"><Icon name="ChevronRight" size={18} /></div>
            <div className="node" style={{ background: 'var(--g-red-soft)' }}><b><Icon name="Send" size={13} /> 流转</b><p>带 AI 标识与复核记录进入行内流程</p><span className="who">信贷 / OA</span></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <span className="chip green"><i />复核采纳率进入验收口径</span><span className="chip"><i />驳回理由回流评测集</span><span className="chip red"><i />不替代内评、分类与审批</span>
          </div>
        </div>
      </div>

      <div className="card sec">
        <div className="card-h">
          <div className="card-t"><span className="dot" />监管对照表</div>
          <span className="chip red"><i />需法务复核 · 对照条目由行方法务最终确认</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th style={{ width: 220 }}>法规 / 标准</th><th>适用要求</th><th>本方案措施</th><th style={{ width: 160 }}>责任方</th><th style={{ width: 90 }}>状态</th></tr></thead>
            <tbody>
              {REGS.map((r) => (
                <tr key={r.name}><td><b>{r.name}</b></td><td>{r.req}</td><td>{r.act}</td><td>{r.who}</td><td><span className="chip orange"><i />需法务复核</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g3 sec">
        {RESP.map((r) => (
          <div className={`card ${r.tone}`} key={r.t}>
            <div className="card-h"><div className="card-t"><span className="dot" />{r.t}</div></div>
            <ul className="ul">{r.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="grid g2 sec">
        <div className="card green">
          <div className="card-h"><div className="card-t"><span className="dot" />外联自检</div><button className="btn green sm" onClick={selfCheck}><Icon name="RefreshCw" size={12} /> 重新自检</button></div>
          <div className="tile" style={{ marginBottom: 10 }}><b className="num green-text">0</b><span>运行期网络请求（设计约束：本地资源 + 本机模型）</span></div>
          <div className="check"><span>本页跨源资源请求</span><span>{ext === null ? '点击自检' : `${ext} 次`}</span></div>
          <div className="check"><span>第三方 SDK / 统计埋点</span><span>0</span></div>
          <div className="check"><span>遥测 / 崩溃上报</span><span>0</span></div>
          <div className="check"><span>模型调用</span><span>本地网关</span></div>
          <div className="check"><span>字体 / 图标 / 图表</span><span>本地打包</span></div>
          <div className="note green" style={{ marginTop: 10 }}>正式交付时提供出站网络白名单为空的部署清单，可由行方在网络层再次验证。</div>
        </div>
        <div className="card blue">
          <div className="card-h"><div className="card-t"><span className="dot" />员工个人信息处理说明</div><span className="card-s">供 HR 与法务审阅</span></div>
          <div className="kv">
            <div className="row" style={{ justifyContent: 'space-between' }}><span>处理内容</span><span style={{ fontWeight: 700 }}>使用记录、陪练成绩、复核采纳、能力画像</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>处理目的</span><span style={{ fontWeight: 700 }}>成长建议、培训匹配、产品改进</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>法律基础</span><span style={{ fontWeight: 700 }}>员工知情同意 + 行内制度授权</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>保存期限</span><span style={{ fontWeight: 700 }}>在职期间 + 行方规定的留存期</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>员工权利</span><span style={{ fontWeight: 700 }}>查阅、更正、申诉标签、申请删除</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>不做的事</span><span style={{ fontWeight: 700 }}>人脸、声纹、形象识别；情绪监测</span></div>
          </div>
          <div className="note blue" style={{ marginTop: 10 }}>能力画像默认只对本人与直属主管可见；是否用于考核、晋档，由行方在配置中明确并告知员工。</div>
        </div>
      </div>
    </div>
  );
}
