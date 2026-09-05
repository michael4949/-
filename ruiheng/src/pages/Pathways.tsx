import { useEffect, useState } from 'react';
import { Icon } from '../components/Shell';
import './pages.css';

const KEY = 'ruiheng.poc.bookings';
interface Booking { name: string; org: string; dept: string; date: string; pre: string; at: string }

const DD_PACK = [
  '营业执照、资质证明与股权结构说明',
  '软件著作权 / 专利清单与核心技术说明',
  '等级保护测评报告与第三方安全测试报告',
  '源代码托管与交付说明（含退出机制）',
  'SBOM 第三方组件清单与漏洞管理流程',
  '数据安全与隐私保护说明、员工个人信息处理说明',
  '供应商信息安全承诺书与保密协议模板',
  '团队构成、近三年经营情况与持续服务能力说明',
  '同类项目参考案例（脱敏）与联系人',
  '服务级别（SLA）、运维方案与应急预案',
];

const PHASE1 = [
  { w: '第 1 周', t: '口径对齐', d: '对齐授信报告模板、检查清单、预警规则口径；确定四项验收指标与基线取数方式（信贷系统已有时间戳）' },
  { w: '第 2 周', t: '虚构数据校准', d: '用 12 家虚构企业与 6 个示范场景跑通全流程，校准提示词、规则引擎与结果面板' },
  { w: '第 3 周', t: '一线试用', d: '2 个支行、8 名客户经理试用；重点：拜访准备、财务诊断、贷后清单、陪练' },
  { w: '第 4 周', t: '第一段评审', d: '输出校准报告；确定第二段脱敏样本清单与三选一前置条件' },
];
const PHASE2 = [
  { w: '第 5 周', t: '环境就绪', d: '前置条件落地；安装包与模型权重离线导入；统一身份认证与审计日志对接（只写）' },
  { w: '第 6~7 周', t: '脱敏样本手工导入', d: '由行方人员完成脱敏并手工导入，不做系统对接；样本全程不出行' },
  { w: '第 8~10 周', t: '真实业务对照', d: '与信贷系统已有时间戳、CRM 拜访记录对照；双人复核流程实跑，采纳 / 驳回理由留痕' },
  { w: '第 11~12 周', t: '验收评审', d: '四项指标对照、法务与合规评审、员工反馈；形成下一步建议（可缩短至第 8 周结束）' },
];

const METRICS = [
  { t: '授信报告初稿耗时', tone: 'red', d: '从发起到初稿提交的时长，基线取自信贷系统已有时间戳；目标：对照组明显缩短', s: '信贷系统时间戳' },
  { t: '核实标注命中率', tone: 'gold', d: 'AI 标注"需核实"的条目中，被复核确认确需核实的比例；目标 ≥ 80%', s: '复核记录' },
  { t: '检查清单采纳率', tone: 'green', d: '贷后 / 合规检查清单条目被一线采纳执行的比例；目标 ≥ 75%', s: '清单勾选留痕' },
  { t: '陪练后拜访转化率', tone: 'blue', d: '陪练后 30 天内拜访→立项的转化率，与未陪练对照组比较', s: 'CRM 拜访记录' },
];

const PRE = [
  { id: 'gpu', t: '行内 GPU 一体机', d: '供应商提供设备与配置清单，行方采购或借用；部署最快，权重与数据均在设备内', tone: 'red' },
  { id: 'cloud', t: '行内云 GPU 资源池', d: '使用行方现有 GPU 资源池，按行内云规范交付镜像；便于扩容与统一运维', tone: 'gold' },
  { id: 'isolated', t: '隔离测试区 + 供应商临时设备', d: '在行方隔离测试区部署供应商临时设备；样本不出行，POC 结束后设备清零并出具销毁记录', tone: 'green' },
];

function load(): Booking[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Booking[]; } catch { return []; } }

export default function Pathways() {
  const [pre, setPre] = useState('gpu');
  const [form, setForm] = useState({ name: '', org: '', dept: '', date: '' });
  const [list, setList] = useState<Booking[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => { setList(load()); }, []);

  const submit = () => {
    if (!form.name || !form.org) { setMsg('请至少填写姓名与机构'); return; }
    const b: Booking = { ...form, pre: PRE.find((p) => p.id === pre)?.t ?? '', at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    const next = [b, ...load()].slice(0, 20);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setMsg('已暂存于本机浏览器（不发送任何请求）'); } catch { setMsg('浏览器存储不可用，仅本次会话保留'); }
    setList(next); setForm({ name: '', org: '', dept: '', date: '' });
  };
  const clear = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setList([]); setMsg('已清空'); };

  return (
    <div>
      <div className="page-h">
        <div>
          <h1><span className="iris-text">合作路径与 POC</span></h1>
          <p>两条准入路径 · 两段式 POC · 以信贷系统已有时间戳为验收基线 · 样本不出行</p>
        </div>
        <div className="row"><span className="chip green"><i />样本不出行</span><span className="chip"><i />不做系统对接</span><span className="chip red"><i />不含任何商务条款</span></div>
      </div>

      <div className="grid g2">
        <div className="card red">
          <div className="card-h"><div className="card-t"><span className="dot" />路径 A · 直接供应商准入</div><span className="chip red"><i />主推</span></div>
          <p className="card-s" style={{ color: 'var(--ink-2)', marginBottom: 10 }}>按行方信息科技外包与供应商管理制度直接准入，供应商提交尽调材料包，行方科技、风险、法务三方评审。</p>
          <b style={{ fontSize: 12, color: 'var(--ink-3)' }}>尽调材料包清单</b>
          <ul className="ul" style={{ marginTop: 6 }}>{DD_PACK.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div className="card gold">
          <div className="card-h"><div className="card-t"><span className="dot" />路径 B · 联合投标</div><span className="chip"><i />备选</span></div>
          <p className="card-s" style={{ color: 'var(--ink-2)', marginBottom: 10 }}>与行内金科子公司或行方既有集成商联合投标，由其作为总包方，睿衡作为应用层分包，<b>公开披露分包关系与责任边界</b>。</p>
          <ul className="ul">
            <li>总包方：项目管理、系统集成、行内环境与运维</li>
            <li>睿衡：应用层产品、模型接入、评测集与人机复核链</li>
            <li>分包关系在投标文件与合同中公开披露，不做隐性分包</li>
            <li>责任划分沿用"供应商 / 行方 / 共同"三类责任卡</li>
            <li>源代码托管与退出机制对总包方与行方同时生效</li>
          </ul>
          <div className="note" style={{ marginTop: 10 }}>两条路径均不改变数据边界：私有化、只读旁路、运行期无外联。</div>
        </div>
      </div>

      <div className="card sec">
        <div className="card-h"><div className="card-t"><span className="dot" />POC 两段式时间轴</div><span className="card-s">第一段 4 周（虚构数据校准） + 第二段 4~8 周（行内环境脱敏样本手工导入）</span></div>
        <div className="grid g2">
          <div>
            <div className="row" style={{ marginBottom: 10 }}><span className="chip green"><i />第一段 · 4 周</span><span className="muted">虚构数据校准，可在供应商环境或行方测试区进行</span></div>
            <div className="tl">{PHASE1.map((e) => <div className="ev" key={e.w}><b>{e.w} · {e.t}</b><p>{e.d}</p></div>)}</div>
          </div>
          <div>
            <div className="row" style={{ marginBottom: 10 }}><span className="chip red"><i />第二段 · 4~8 周</span><span className="muted">行内环境 · 脱敏样本手工导入 · 不做系统对接 · 样本不出行</span></div>
            <div className="tl">{PHASE2.map((e) => <div className="ev" key={e.w}><b>{e.w} · {e.t}</b><p>{e.d}</p></div>)}</div>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h"><h2><Icon name="ClipboardCheck" size={16} /> 验收口径</h2><p>全部取自信贷系统已有时间戳、复核记录与 CRM，不新增人工填报</p></div>
        <div className="grid g4">
          {METRICS.map((m) => (
            <div className={`card ${m.tone}`} key={m.t}>
              <div className="card-t">{m.t}</div>
              <p className="card-s" style={{ color: 'var(--ink-2)', margin: '6px 0 10px' }}>{m.d}</p>
              <span className="chip"><i />来源：{m.s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="sec-h"><h2><Icon name="ServerCog" size={16} /> 前置条件（三选一）</h2><p>第二段开始前由行方确定一项</p></div>
        <div className="grid g3">
          {PRE.map((p) => (
            <div className={`card opt ${p.tone}${pre === p.id ? ' on' : ''}`} key={p.id} onClick={() => setPre(p.id)}>
              <div className="card-h"><div className="card-t">{p.t}</div><span className={`chip ${pre === p.id ? 'green' : ''}`}><i />{pre === p.id ? '已选择' : '选择'}</span></div>
              <p className="card-s" style={{ color: 'var(--ink-2)' }}>{p.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g2 sec">
        <div className="card purple">
          <div className="card-h"><div className="card-t"><span className="dot" />预约 POC 沟通</div><span className="card-s">前端暂存于本机浏览器 · 不发送请求</span></div>
          <div className="form-grid">
            <div><label className="lbl">姓名</label><input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="您的姓名" /></div>
            <div><label className="lbl">机构</label><input className="inp" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="银行 / 分行" /></div>
            <div><label className="lbl">部门</label><input className="inp" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} placeholder="公司业务部 / 科技部 / 风险部" /></div>
            <div><label className="lbl">期望日期</label><input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
            <span className="muted">前置条件：{PRE.find((p) => p.id === pre)?.t}</span>
            <div className="row">
              <button className="btn ghost sm" onClick={clear}><Icon name="Trash2" size={12} /> 清空暂存</button>
              <button className="btn" onClick={submit}><Icon name="CalendarCheck" size={14} /> 提交预约</button>
            </div>
          </div>
          {msg && <div className="note green fade-in" style={{ marginTop: 10 }}>{msg}</div>}
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />已暂存预约</div><span className="chip">{list.length} 条</span></div>
          {list.length === 0 ? (
            <div className="empty"><Icon name="Inbox" size={28} /><div className="big">暂无预约</div><p className="muted">提交后显示于此，仅保存在当前浏览器</p></div>
          ) : list.map((b, i) => (
            <div className="li" key={i}>
              <div style={{ flex: 1 }}><div className="t">{b.name} · {b.org}{b.dept ? ` · ${b.dept}` : ''}</div><div className="s">期望 {b.date || '待定'} · 前置条件：{b.pre} · 暂存于 {b.at}</div></div>
              <span className="chip green"><i />本机</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
