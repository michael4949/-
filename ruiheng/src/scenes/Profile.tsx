import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { TEAM, RADAR_DIMS } from '../data/team';
import { PERSONAS } from '../data/personas';
import { rng } from '../lib/rng';
import { Icon } from '../components/Shell';
import '../pages/pages.css';

const ME = PERSONAS[1]; // 王志远
const MEMBER = TEAM.find((m) => m.name === ME.name);
/** 本季度 10 维得分（与 RADAR_DIMS 顺序一致：财务分析 风险识别 方案设计 沟通谈判 合规意识 客户经营 行业洞察 产品知识 数字工具 协作执行） */
const MY = [82, 74, 70, 78, 88, 76, 66, 80, 84, 79];
const LAST_Q = [78, 70, 66, 76, 86, 72, 61, 77, 78, 75];
const LAST_YEAR = [70, 62, 58, 70, 80, 64, 52, 70, 62, 68];
const TEAM_AVG = RADAR_DIMS.map((_, i) => Math.round(TEAM.reduce((s, m) => s + m.radar[i], 0) / TEAM.length));
const COLORS = ['#e63946', '#f4b942', '#2dc48d', '#3a86ff', '#9b5de5', '#ff8c42', '#00b4d8', '#ff5da2', '#1f8a5a', '#c9a24d'];

/** 资深档位阈值（演示用；是否与行内序列挂钩由行方配置） */
const SENIOR_GATE: { dim: string; gate: number }[] = [
  { dim: '行业洞察', gate: 75 }, { dim: '方案设计', gate: 78 }, { dim: '风险识别', gate: 80 }, { dim: '客户经营', gate: 80 }, { dim: '沟通谈判', gate: 80 },
];

const TAG_GROUPS: { name: string; tone: string; tags: string[] }[] = [
  { name: '擅长行业', tone: 'red', tags: ['精密制造', '医药流通', '软件'] },
  { name: '擅长产品', tone: '', tags: ['流动资金贷款', '固定资产贷款', '供应链保理'] },
  { name: '客户类型', tone: 'green', tags: ['中型民企', '专精特新'] },
  { name: '沟通风格', tone: 'blue', tags: ['数据驱动', '稳健'] },
  { name: '风险偏好', tone: 'purple', tags: ['审慎'] },
  { name: '合规记录', tone: 'green', tags: ['0 违规', '复核采纳率高'] },
  { name: '协作', tone: 'orange', tags: ['跨部门协调佳', '带教 2 名新人'] },
  { name: 'AI 工具使用', tone: 'iris', tags: ['财务诊断 高频', '授信工作台 高频', '陪练 每周 2 次'] },
];

const BADGES: { name: string; sub: string; icon: string; tone: string; got: boolean }[] = [
  { name: '首份独立授信报告', sub: '2024-03', icon: 'FileCheck2', tone: 'gold', got: true },
  { name: '预警处置 10 次', sub: '本年累计', icon: 'ShieldAlert', tone: 'red', got: true },
  { name: '陪练 90 分', sub: '续贷谈判场景', icon: 'MessagesSquare', tone: 'green', got: true },
  { name: '交叉销售达人', sub: '联动 3 类产品', icon: 'Sparkles', tone: 'iris', got: true },
  { name: '零违规 12 个月', sub: '合规连续记录', icon: 'ShieldCheck', tone: 'green', got: true },
  { name: '带教导师', sub: '带教 2 名新人', icon: 'Users', tone: 'gold', got: true },
  { name: '行业研究 3 篇', sub: '进度 1/3', icon: 'BookOpen', tone: 'lock', got: false },
  { name: '集团客户方案', sub: '待完成首个', icon: 'Network', tone: 'lock', got: false },
];

const SUGGESTIONS: { title: string; body: string; to: string; label: string }[] = [
  { title: '补齐最弱维度「行业洞察」（66）', body: '用行业与宏观研判为名下精密制造客户（宁桂精密）生成产业链风险图谱并复盘，两周内提交一篇行业研究，可同时解锁徽章。', to: '/p/P04', label: '行业与宏观研判' },
  { title: '方案设计（70）用真实续贷练手', body: '衡瑞医药流通 60 天后授信到期，用方案设计与智能定价做「续贷 + 结算 + 供应链」组合方案演练，输出经复核后可直接使用。', to: '/p/P05', label: '方案设计与智能定价' },
  { title: '沟通谈判（78）冲 90 分', body: '在智能陪练底座选择「续贷条件谈判 · 强势财务总监」场景，每周 2 次，重点训练异议处理与让步节奏。', to: '/scene/sparring', label: '智能陪练' },
];

const MONTHS = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

export default function Profile() {
  const [copied, setCopied] = useState(false);
  const radar = useMemo(() => RADAR_DIMS.map((d, i) => ({ dim: d, me: MY[i], team: TEAM_AVG[i], last: LAST_Q[i] })), []);
  const growth = useMemo(() => {
    const r = rng(20260905);
    return MONTHS.map((m, mi) => {
      const row: Record<string, number | string> = { month: m.slice(2) };
      RADAR_DIMS.forEach((d, i) => {
        const t = mi / (MONTHS.length - 1);
        const v = LAST_YEAR[i] + (MY[i] - LAST_YEAR[i]) * t + (mi === MONTHS.length - 1 ? 0 : (r() - 0.5) * 4);
        row[d] = Math.round(v);
      });
      return row;
    });
  }, []);
  const avg = Math.round(MY.reduce((s, v) => s + v, 0) / MY.length);
  const bio = `${ME.name} · 远山银行城东支行 企金客户经理 · 从业 ${ME.years} · 服务企业 ${ME.customers} 户。深耕精密制造、医药流通与软件行业，擅长流动资金贷款、固定资产贷款与供应链保理方案设计；主要服务中型民企与专精特新企业。工作风格数据驱动、稳健审慎，合规记录 0 违规，跨部门协作口碑良好。`;

  const copy = async () => {
    const text = `【专业名片】\n${bio}\n擅长行业：精密制造 / 医药流通 / 软件\n擅长产品：流动资金贷款 / 固定资产贷款 / 供应链保理`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      setCopied(true); window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

  return (
    <div>
      <div className="hero">
        <div className="hero-grid">
          <div>
            <div className="row"><span className="chip iris">P14 · 能力画像与成长</span><span className="chip gold"><i />示范场景</span><span className="ai-tag">画像仅用于成长建议 · 是否用于考核由行方配置</span></div>
            <h1 style={{ marginTop: 6 }}><span className="serif iris-text">{ME.name}</span> <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-2)' }}>{ME.title} · {ME.years} · 管户 {ME.customers} 户</span></h1>
            <div className="tag">{ME.org} · 重点：{ME.focus}</div>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="chip green"><i />综合 {avg} 分</span>
              <span className="chip"><i />团队均值 {Math.round(TEAM_AVG.reduce((s, v) => s + v, 0) / TEAM_AVG.length)} 分</span>
              <span className="chip red"><i />较上季度 +{avg - Math.round(LAST_Q.reduce((s, v) => s + v, 0) / LAST_Q.length)}</span>
            </div>
          </div>
          <div className="tiles">
            <div className="tile"><b className="num green-text">91%</b><span>本季度复核采纳率 <em className="delta up">+4pp</em></span></div>
            <div className="tile"><b className="num gold-text">1.2 天</b><span>预警处置时效 <em className="delta up">-0.3 天</em></span></div>
            <div className="tile"><b className="num red-text">88</b><span>陪练平均分 <em className="delta up">+6</em></span></div>
          </div>
        </div>
      </div>

      <div className="grid g2 sec">
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />多维能力雷达（10 维）</div><span className="card-s">本人 vs 团队均值 vs 上季度</span></div>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radar} outerRadius="72%">
              <defs>
                <linearGradient id="gMe" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e63946" stopOpacity={0.55} /><stop offset="100%" stopColor="#f4b942" stopOpacity={0.35} /></linearGradient>
                <linearGradient id="gTeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3a86ff" stopOpacity={0.3} /><stop offset="100%" stopColor="#00b4d8" stopOpacity={0.15} /></linearGradient>
                <linearGradient id="gLast" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9b5de5" stopOpacity={0.25} /><stop offset="100%" stopColor="#ff5da2" stopOpacity={0.12} /></linearGradient>
              </defs>
              <PolarGrid stroke="rgba(120,100,60,.22)" />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#5f5850' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="团队均值" dataKey="team" stroke="#3a86ff" fill="url(#gTeam)" fillOpacity={1} isAnimationActive={false} />
              <Radar name="上季度" dataKey="last" stroke="#9b5de5" strokeDasharray="4 3" fill="url(#gLast)" fillOpacity={1} isAnimationActive={false} />
              <Radar name="本人（本季度）" dataKey="me" stroke="#c3272b" strokeWidth={2} fill="url(#gMe)" fillOpacity={1} isAnimationActive={false} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card gold">
          <div className="card-h"><div className="card-t"><span className="dot" />丰富标签</div><span className="card-s">由行为数据与复核记录自动归纳 · 本人可申诉修正</span></div>
          {TAG_GROUPS.map((g) => (
            <div className="tag-grp" key={g.name}>
              <b>{g.name}</b>
              <div className="row">{g.tags.map((t) => <span key={t} className={`chip ${g.tone}`}><i />{t}</span>)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card sec">
        <div className="card-h"><div className="card-t"><span className="dot" />能力成长时间线</div><span className="card-s">近 12 个月 10 维得分变化</span></div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={growth} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(120,100,60,.14)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {RADAR_DIMS.map((d, i) => <Line key={d} type="monotone" dataKey={d} stroke={COLORS[i]} strokeWidth={i === 6 || i === 2 ? 2.5 : 1.6} dot={false} activeDot={{ r: 4 }} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid g2 sec">
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />成就徽章</div><span className="card-s">{BADGES.filter((b) => b.got).length} / {BADGES.length} 已获得</span></div>
          <div className="badges">
            {BADGES.map((b) => (
              <div className="badge" key={b.name}>
                <div className={`ring ${b.tone}`}><Icon name={b.got ? b.icon : 'Lock'} size={24} /></div>
                <b>{b.name}</b><span>{b.sub}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card green">
          <div className="card-h"><div className="card-t"><span className="dot" />本季度亮点</div><span className="card-s">2026 Q3</span></div>
          <div className="kv">
            <div className="check"><span>授信报告复核采纳率</span><span>91%（团队 83%）</span></div>
            <div className="check"><span>预警处置时效</span><span>1.2 天（团队 2.1 天）</span></div>
            <div className="check"><span>陪练平均分</span><span>88 分（最高 92）</span></div>
            <div className="check"><span>贷后检查清单采纳率</span><span>86%</span></div>
            <div className="check"><span>拜访准备平均用时</span><span>18 分钟（上季度 35）</span></div>
            <div className="check"><span>合规检查异常</span><span>0 项</span></div>
          </div>
          <div className="note green" style={{ marginTop: 12 }}>指标来自信贷系统时间戳、复核记录与陪练日志，不新增人工填报。</div>
        </div>
      </div>

      <div className="grid g3 sec">
        {SUGGESTIONS.map((s, i) => (
          <div className={`card ${['red', 'gold', 'blue'][i]}`} key={s.title}>
            <div className="sug">
              <div className="n">{i + 1}</div>
              <div>
                <div className="card-t">{s.title}</div>
                <p className="card-s" style={{ margin: '6px 0 10px', color: 'var(--ink-2)' }}>{s.body}</p>
                <Link to={s.to} className="btn sm ghost"><Icon name="ArrowRight" size={12} /> 打开{s.label}</Link>
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}><span className="ai-tag">AI 建议 · 个性化</span></div>
          </div>
        ))}
      </div>

      <div className="grid g2 sec">
        <div className="card purple">
          <div className="card-h"><div className="card-t"><span className="dot" />晋档建议：中级 → 资深</div><span className="chip purple">差距 {SENIOR_GATE.filter((g) => MY[RADAR_DIMS.indexOf(g.dim)] < g.gate).length} 项</span></div>
          {SENIOR_GATE.map((g) => {
            const v = MY[RADAR_DIMS.indexOf(g.dim)]; const gap = Math.max(0, g.gate - v);
            return (
              <div className="gap" key={g.dim}>
                <div className="gh"><span><b>{g.dim}</b> 当前 {v}</span><span>{gap > 0 ? <span className="red-text">差 {gap} 分</span> : <span className="green-text">已达标</span>} · 阈值 {g.gate}</span></div>
                <div className="bar"><i style={{ width: `${v}%` }} /><em style={{ left: `${g.gate}%` }} /></div>
              </div>
            );
          })}
          <div className="note" style={{ marginTop: 10 }}>系统按能力阈值提示差距，并给出对应的学习与实战路径；<b>是否与行内职级序列挂钩、阈值取值，均由行方配置</b>，本系统不直接产生人事结论。</div>
        </div>
        <div className="namecard">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row"><span className="chip">专业名片</span><span className="chip">系统生成 · 可编辑</span></div>
            <button className="btn gold sm" onClick={copy}><Icon name={copied ? 'Check' : 'Copy'} size={12} /> {copied ? '已复制' : '复制名片'}</button>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, margin: '12px 0 2px' }} className="serif">{ME.name} <span style={{ fontSize: 13, fontWeight: 600, opacity: .85 }}>{ME.title}</span></div>
          <div className="row" style={{ margin: '8px 0 10px' }}>
            {['精密制造', '医药流通', '软件', '流动资金贷款', '固定资产贷款', '供应链保理', '专精特新'].map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
          <p>{bio}</p>
          <div className="row" style={{ marginTop: 10 }}><span className="ai-tag" style={{ background: 'rgba(255,255,255,.14)', color: '#fff8e8' }}>用于对外介绍与拜访前发送 · 不含任何客户信息</span></div>
        </div>
      </div>
    </div>
  );
}
