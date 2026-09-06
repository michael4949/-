import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, PiggyBank, Landmark, ShieldAlert, Sparkles, Bot, MapPinned, BellRing, TrendingUp, Layers3, Users, Radar as RadarIcon,
  ListTodo, Scale, Award, Wand2, ChevronRight, CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList,
  ScatterChart, Scatter, ZAxis, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import CityMap from '../components/CityMap';
import { COMPANIES } from '../data/companies';
import { PERSONAS } from '../data/personas';
import { TEAM, RADAR_DIMS } from '../data/team';
import { PAL } from '../lib/cityMap';
import { rng, fmtWan } from '../lib/rng';
import './dashboard.css';

/* ------------------------------------------------------------------ 数据（全部虚构、自洽） */
const ME = PERSONAS[1]; // 王志远
const ME_MEMBER = TEAM.find((m) => m.name === ME.name) ?? TEAM[1];
const AXIS = { fontSize: 11, fill: '#8c8478' } as const;
const GRID = 'rgba(120,100,60,.14)';

const KPI = [
  { k: '管户数', v: '46', unit: '户', delta: '+3 本月', up: true, icon: <Building2 size={15} />, cls: '' },
  { k: '存款余额', v: '2.87', unit: '亿', delta: '+6.2%', up: true, icon: <PiggyBank size={15} />, cls: 'money' },
  { k: '贷款余额', v: '4.12', unit: '亿', delta: '+2.4%', up: true, icon: <Landmark size={15} />, cls: 'gold' },
  { k: '今日预警', v: '3', unit: '条', delta: '1 红 · 2 橙', up: false, icon: <ShieldAlert size={15} />, cls: 'warn' },
  { k: '商机', v: '7', unit: '个', delta: '今日 +2', up: true, icon: <Sparkles size={15} />, cls: 'gold' },
  { k: 'AI 使用率', v: '86', unit: '%', delta: '+9 pt', up: true, icon: <Bot size={15} />, cls: '' },
];

const ALERTS = [
  { name: '红色 · 高风险', value: 2, g: 'red', sw: 'linear-gradient(135deg,#ff7a70,#8e1b1b)' },
  { name: '橙色 · 关注', value: 5, g: 'orange', sw: 'linear-gradient(135deg,#ffb27a,#d9781b)' },
  { name: '黄色 · 提示', value: 9, g: 'yellow', sw: 'linear-gradient(135deg,#ffe08a,#c9a24d)' },
  { name: '绿色 · 正常', value: 30, g: 'green', sw: 'linear-gradient(135deg,#6ee3ad,#155e3e)' },
];

const FUNNEL = [
  { s: '线索', n: 28, amt: 6.8, c: [PAL.c1, '#8e1b1b'] },
  { s: '尽调', n: 16, amt: 4.1, c: [PAL.c6, '#d9781b'] },
  { s: '审查', n: 11, amt: 2.9, c: [PAL.c2, '#c9a24d'] },
  { s: '审批', n: 8, amt: 2.2, c: [PAL.c3, '#1f8a5a'] },
  { s: '放款', n: 6, amt: 1.6, c: ['#3dbb86', '#155e3e'] },
];

const MONTHS = ['10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月'];
const TREND = (() => {
  const r = rng(20250901);
  return MONTHS.map((m, i) => ({
    m,
    deposit: i === 11 ? 2.87 : +(2.31 + i * 0.047 + (r() - 0.5) * 0.12).toFixed(2),
    loan: i === 11 ? 4.12 : +(3.62 + i * 0.044 + (r() - 0.5) * 0.1).toFixed(2),
  }));
})();

const INDUSTRY = (() => {
  const m = new Map<string, { industry: string; exposure: number; deposit: number; n: number }>();
  for (const c of COMPANIES) {
    const e = m.get(c.industry) ?? { industry: c.industry, exposure: 0, deposit: 0, n: 0 };
    e.exposure += c.exposure; e.deposit += c.deposit; e.n += 1; m.set(c.industry, e);
  }
  return [...m.values()].filter((x) => x.exposure > 0).sort((a, b) => b.exposure - a.exposure);
})();

const RADAR = RADAR_DIMS.map((dim, i) => ({
  dim, team: Math.round(TEAM.reduce((s, t) => s + t.radar[i], 0) / TEAM.length), me: ME_MEMBER.radar[i],
}));

const BRANCHES = [
  { name: '城东支行', color: PAL.c1, sw: 'linear-gradient(135deg,#ff7a70,#c3272b)', grad: 'g-sc1' },
  { name: '高新支行', color: PAL.c4, sw: 'linear-gradient(135deg,#7fb0ff,#1d4ed8)', grad: 'g-sc2' },
];
const AVG_AI = Math.round(TEAM.reduce((s, t) => s + t.aiUse, 0) / TEAM.length);

type Tone = 'red' | 'orange' | 'green' | 'blue' | 'gold';
const TODO: { id: string | null; kind: string; tone: Tone; t: string; s: string; to?: string }[] = [
  { id: 'caisheng', kind: '预警', tone: 'red', t: '彩晟商贸 被执行 860 万，结算量降 62%', s: '风险向晟禾食品传导 · 建议今日处置', to: '/scene/postloan' },
  { id: 'shenghe', kind: '预警', tone: 'orange', t: '晟禾食品集团 发现 2 家隐性关联', s: '集团授信占用需重新核定', to: '/scene/group' },
  { id: 'beiling', kind: '预警', tone: 'orange', t: '北岭铝材 票据逾期 1 笔', s: '宁桂精密上游 · 供应链传导核查' },
  { id: 'c09', kind: '商机', tone: 'green', t: '嘉禾连锁餐饮 结算量环比 +28%', s: '存款 + 收单综合方案' },
  { id: 'c05', kind: '商机', tone: 'green', t: '桂澜跨境电商 东盟收汇结汇需求', s: '跨境结算 + 远期锁汇' },
  { id: null, kind: '政策', tone: 'blue', t: '制造业中长期贷款贴息政策更新', s: '宁桂精密 / 东岭新能源 符合条件', to: '/p/P11' },
  { id: 'c06', kind: '待办', tone: 'gold', t: '衡瑞医药流通 续贷 60 天到期', s: '启动续贷尽调 · 资料清单已生成' },
];

const SANDBOX = [
  { opt: '追加押品', exposure: 15, migrate: 35, relation: 10 },
  { opt: '压降续贷', exposure: 45, migrate: 15, relation: -20 },
  { opt: '提前收回', exposure: 100, migrate: -40, relation: -70 },
];
const SB_SERIES = [
  { key: 'exposure', name: '组合敞口', grad: 'g-sb1', sw: 'linear-gradient(180deg,#ff7a70,#c3272b)' },
  { key: 'migrate', name: '五级分类迁徙', grad: 'g-sb2', sw: 'linear-gradient(180deg,#f7e2a5,#c9a24d)' },
  { key: 'relation', name: '客户关系', grad: 'g-sb3', sw: 'linear-gradient(180deg,#6ee3ad,#1f8a5a)' },
];



const AI_WEEK = [
  { k: '生成授信 / 贷后报告', v: 12, unit: '份', pct: 80 },
  { k: '陪练对练', v: 3, unit: '场', pct: 60 },
  { k: '制度与政策问答', v: 27, unit: '次', pct: 90 },
  { k: '预估节省工时', v: 9.5, unit: '小时', pct: 72 },
];

/* ------------------------------------------------------------------ 小组件 */
type TipItem = { name?: string | number; value?: number | string | ReadonlyArray<number | string>; payload?: unknown };
const fmtV = (v: TipItem['value'], fmt?: (n: number) => string) => (typeof v === 'number' ? (fmt ? fmt(v) : v.toLocaleString('zh-CN')) : String(v ?? ''));

function ChartTip({ active, payload, label, swatches, unit, fmt }: {
  active?: boolean; payload?: ReadonlyArray<TipItem>; label?: unknown; swatches?: string[]; unit?: string; fmt?: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rc-tip">
      {label != null && label !== '' && <div className="rc-tip-l">{String(label)}</div>}
      {payload.map((p, i) => (
        <div key={i} className="rc-tip-r"><i style={swatches?.[i] ? { background: swatches[i] } : undefined} /><span>{p.name}</span><b className="num">{fmtV(p.value, fmt)}{unit}</b></div>
      ))}
    </div>
  );
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<TipItem> }) {
  const d = payload?.[0]?.payload as { name: string; branch: string; level: string; aiUse: number; deposits: number; customers: number } | undefined;
  if (!active || !d) return null;
  return (
    <div className="rc-tip">
      <div className="rc-tip-l">{d.name} · {d.branch}</div>
      <div className="rc-tip-r"><span>AI 使用率</span><b className="num">{d.aiUse}%</b></div>
      <div className="rc-tip-r"><span>存款</span><b className="num">{fmtWan(d.deposits)}</b></div>
      <div className="rc-tip-r"><span>管户</span><b className="num">{d.customers} 户</b></div>
    </div>
  );
}

function Card({ title, icon, sub, cls, children, right }: { title: string; icon?: ReactNode; sub?: string; cls?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className={`card ${cls ?? ''}`}>
      <div className="card-h">
        <div className="card-t"><span className="dot" />{icon}{title}</div>
        {right ?? (sub && <span className="card-s">{sub}</span>)}
      </div>
      {children}
    </div>
  );
}

function Funnel() {
  const W = 320, H = 158, n = FUNNEL.length, rowH = (H - 8) / n, cx = 150, maxW = 196;
  return (
    <div className="funnel">
      <svg viewBox={`0 0 ${W} ${H}`}>
        <defs>
          {FUNNEL.map((f, i) => (
            <linearGradient key={i} id={`g-fn${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={f.c[0]} /><stop offset="1" stopColor={f.c[1]} /></linearGradient>
          ))}
        </defs>
        {FUNNEL.map((f, i) => {
          const y = 4 + i * rowH, h = rowH - 4;
          const wt = (maxW * f.n) / FUNNEL[0].n, wb = i < n - 1 ? (maxW * FUNNEL[i + 1].n) / FUNNEL[0].n : wt * 0.82;
          const conv = i === 0 ? 100 : Math.round((f.n / FUNNEL[i - 1].n) * 100);
          return (
            <g key={f.s}>
              <path d={`M${cx - wt / 2},${y} L${cx + wt / 2},${y} L${cx + wb / 2},${y + h} L${cx - wb / 2},${y + h} Z`} fill={`url(#g-fn${i})`} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
              <text x={cx} y={y + h / 2 + 4} textAnchor="middle" className="funnel-in">{f.n} 件</text>
              <text x={4} y={y + h / 2 + 4} className="funnel-lbl">{f.s}</text>
              <text x={W - 2} y={y + h / 2 - 1} textAnchor="end" className="funnel-val">{f.amt.toFixed(1)} 亿</text>
              <text x={W - 2} y={y + h / 2 + 10} textAnchor="end" className="funnel-sub">{i === 0 ? '本月新增' : `转化 ${conv}%`}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ 页面 */
export default function Dashboard() {
  const [selected, setSelected] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const h = now.getHours();
  const greet = h < 6 ? '夜深了' : h < 11 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
  const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  const alertTotal = ALERTS.reduce((s, a) => s + a.value, 0);
  const scatterBy = (b: string) => TEAM.filter((m) => m.branch === b).map((m) => ({ name: m.name, branch: m.branch, level: m.level, aiUse: m.aiUse, deposits: m.deposits, customers: m.customers }));

  return (
    <div className="fade-in">
      {/* 横幅 */}
      <div className="hero dash-hero">
        <div className="mark serif">{ME.avatar}</div>
        <div>
          <h1>{greet}，{ME.name}</h1>
          <div className="brief">今天 <b className="r">3 条预警</b>、<b className="g">2 个商机</b>、<b className="b">1 条政策</b> 需要处理；企金智脑已为你生成 <b>彩晟商贸</b> 处置沙盘与 <b>衡瑞医药</b> 续贷资料清单。</div>
        </div>
        <div className="chips">
          <span className="chip"><i />{ME.org.split('·')[1].trim()} · {ME.title}</span>
          <span className="chip gold"><CalendarDays size={12} />{dateStr}</span>
          <span className="chip red"><i />1 条红色预警待处置</span>
          <span className="chip green"><i />AI 引擎 · 行内私有化</span>
          <Link to="/scene/postloan" className="btn sm">开始今日巡检 <ChevronRight size={13} /></Link>
        </div>
      </div>

      <div className="dash">
        {/* 1. KPI 瓦片行 */}
        <div className="card span4">
          <div className="card-h"><div className="card-t"><span className="dot" /><TrendingUp size={15} />今日经营看板</div><span className="card-s">数据截至 {dateStr} 09:00 · 单位：万元 / 亿元</span></div>
          <div className="grid g6">
            {KPI.map((k) => (
              <div key={k.k} className={`tile ${k.cls}`}>
                <span className="ico">{k.icon}</span>
                <span>{k.k}</span>
                <b className="num">{k.v}<small>{k.unit}</small></b>
                <span className={`delta ${k.up ? 'up' : 'down'}`}>{k.delta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 中心地图 */}
        <div className="card map-card">
          <div className="card-h">
            <div className="card-t"><span className="dot" /><MapPinned size={15} />远山市客户地图 · 组合风险与产业集群</div>
            <span className="card-s">悬停查看 · 点击客户查看详情</span>
          </div>
          <CityMap selected={selected} onSelect={setSelected} />
        </div>

        {/* 3. 预警分布 */}
        <Card title="预警分布" icon={<BellRing size={15} />} sub={`${alertTotal} 户管户`}>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={176}>
              <PieChart>
                <defs>
                  <radialGradient id="g-rk-red" cx=".3" cy=".3" r="1"><stop offset="0" stopColor="#ff7a70" /><stop offset="1" stopColor="#8e1b1b" /></radialGradient>
                  <radialGradient id="g-rk-orange" cx=".3" cy=".3" r="1"><stop offset="0" stopColor="#ffb27a" /><stop offset="1" stopColor="#d9781b" /></radialGradient>
                  <radialGradient id="g-rk-yellow" cx=".3" cy=".3" r="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#c9a24d" /></radialGradient>
                  <radialGradient id="g-rk-green" cx=".3" cy=".3" r="1"><stop offset="0" stopColor="#6ee3ad" /><stop offset="1" stopColor="#155e3e" /></radialGradient>
                </defs>
                <Pie data={ALERTS} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} cornerRadius={5} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                  {ALERTS.map((a) => <Cell key={a.g} fill={`url(#g-rk-${a.g})`} />)}
                </Pie>
                <Tooltip content={<ChartTip unit=" 户" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-c"><b className="num">{alertTotal}</b><span>户 · 红橙 {ALERTS[0].value + ALERTS[1].value} 户需关注</span></div>
          </div>
          <div className="legend-chips" style={{ marginTop: 6 }}>
            {ALERTS.map((a) => <span key={a.g}><i className="round" style={{ background: a.sw }} />{a.name.split(' · ')[1]} <b className="num">{a.value}</b></span>)}
          </div>
        </Card>

        {/* 4. 授信进度漏斗 */}
        <Card title="授信进度漏斗" icon={<Layers3 size={15} />} sub="本月 · 件数 / 金额" cls="gold">
          <Funnel />
          <div className="chart-foot">总体转化 <b>21%</b>，审查环节平均停留 <b>4.2 天</b>，较上月缩短 1.1 天。</div>
        </Card>

        {/* 5. 行业敞口 */}
        <Card title="行业敞口分布" icon={<Landmark size={15} />} sub="重点客户 · 万元" cls="green">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={INDUSTRY} layout="vertical" margin={{ top: 4, right: 58, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="g-bar-iris" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3272b" /><stop offset=".5" stopColor="#e3a93c" /><stop offset="1" stopColor="#3dbb86" /></linearGradient>
              </defs>
              <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="industry" width={62} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<ChartTip fmt={fmtWan} swatches={['linear-gradient(90deg,#c3272b,#e3a93c,#3dbb86)']} />} />
              <Bar dataKey="exposure" name="本行敞口" fill="url(#g-bar-iris)" radius={[0, 6, 6, 0]} barSize={14} isAnimationActive={false}>
                <LabelList dataKey="exposure" position="right" formatter={(v) => fmtWan(Number(v))} fontSize={11} fill="#5f5850" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-foot">新能源 + 食品加工合计占敞口 <b>56%</b>，行业集中度提示。</div>
        </Card>

        {/* 6. 今日待办 / 预警 */}
        <Card title="今日待办 · 预警 · 商机" icon={<ListTodo size={15} />} sub={`${TODO.length} 项`}>
          <div className="todo-list grow">
            {TODO.map((t, i) => {
              const inner = (
                <>
                  <div className={`av ${t.tone}`}>{t.kind.slice(0, 2)}</div>
                  <div className="grow"><div className="t">{t.t}</div><div className="s">{t.s}</div></div>
                  <span className={`chip ${t.tone === 'gold' ? '' : t.tone}`}>{t.kind}</span>
                </>
              );
              const cls = `li clickable${t.id && t.id === selected ? ' on' : ''}`;
              return t.id ? (
                <div key={i} className={cls} onClick={() => setSelected(t.id)} title="在地图上定位">{inner}</div>
              ) : (
                <Link key={i} to={t.to ?? '/'} className={cls}>{inner}</Link>
              );
            })}
          </div>
        </Card>

        {/* 7. 存贷趋势 */}
        <Card title="近 12 个月存贷趋势" icon={<TrendingUp size={15} />} sub="余额 · 亿元" cls="span2">
          <div className="legend-chips" style={{ marginBottom: 4 }}>
            <span><i style={{ background: 'linear-gradient(135deg,#6ee3ad,#1f8a5a)' }} />存款余额</span>
            <span><i style={{ background: 'linear-gradient(135deg,#f7e2a5,#c3272b)' }} />贷款余额</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={TREND} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
              <defs>
                <linearGradient id="g-ar-dep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3dbb86" stopOpacity=".6" /><stop offset="1" stopColor="#1f8a5a" stopOpacity=".04" /></linearGradient>
                <linearGradient id="g-ar-loan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3a93c" stopOpacity=".55" /><stop offset="1" stopColor="#c3272b" stopOpacity=".04" /></linearGradient>
                <linearGradient id="g-ln-dep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3dbb86" /><stop offset="1" stopColor="#155e3e" /></linearGradient>
                <linearGradient id="g-ln-loan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e3a93c" /><stop offset="1" stopColor="#c3272b" /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="m" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[2, 4.5]} tickFormatter={(v) => `${v}`} />
              <Tooltip content={<ChartTip unit=" 亿" fmt={(n) => n.toFixed(2)} swatches={['linear-gradient(135deg,#6ee3ad,#1f8a5a)', 'linear-gradient(135deg,#f7e2a5,#c3272b)']} />} />
              <Area type="monotone" dataKey="deposit" name="存款余额" stroke="url(#g-ln-dep)" strokeWidth={2.4} fill="url(#g-ar-dep)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
              <Area type="monotone" dataKey="loan" name="贷款余额" stroke="url(#g-ln-loan)" strokeWidth={2.4} fill="url(#g-ar-loan)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* 8. 团队效能 */}
        <Card title="团队效能" icon={<Users size={15} />} sub="AI 使用率 vs 存款" cls="blue">
          <div className="legend-chips" style={{ marginBottom: 4 }}>
            {BRANCHES.map((b) => <span key={b.name}><i className="round" style={{ background: b.sw }} />{b.name}</span>)}
            <span><i style={{ width: 14, height: 2, background: '#9c7a2e' }} />团队均值</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
              <defs>
                <radialGradient id="g-sc1" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#ff7a70" /><stop offset="1" stopColor="#c3272b" /></radialGradient>
                <radialGradient id="g-sc2" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#7fb0ff" /><stop offset="1" stopColor="#1d4ed8" /></radialGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="aiUse" name="AI 使用率" unit="%" domain={[30, 100]} tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="deposits" name="存款" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 100) / 10}亿`} />
              <ZAxis type="number" dataKey="customers" range={[50, 220]} />
              <ReferenceLine x={AVG_AI} stroke="#9c7a2e" strokeDasharray="4 4" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTip />} />
              {BRANCHES.map((b) => <Scatter key={b.name} name={b.name} data={scatterBy(b.name)} fill={`url(#${b.grad})`} stroke="#fff" strokeWidth={1.5} fillOpacity={0.92} isAnimationActive={false} />)}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="chart-foot">气泡大小 = 管户数；AI 使用率高于均值 <b>{AVG_AI}%</b> 的成员存款均值高 <b>18%</b>。</div>
        </Card>

        {/* 9. 团队能力雷达 */}
        <Card title="团队能力雷达" icon={<RadarIcon size={15} />} sub="10 维 · 团队均值 vs 本人" cls="purple">
          <div className="legend-chips" style={{ marginBottom: 2 }}>
            <span><i style={{ background: 'linear-gradient(135deg,#f7e2a5,#c9a24d)' }} />团队均值</span>
            <span><i style={{ background: 'linear-gradient(135deg,#ff7a70,#c3272b)' }} />{ME.name}</span>
          </div>
          <ResponsiveContainer width="100%" height={218}>
            <RadarChart data={RADAR} cx="50%" cy="52%" outerRadius="78%">
              <defs>
                <linearGradient id="g-rd-team" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" stopOpacity=".7" /><stop offset="1" stopColor="#c9a24d" stopOpacity=".35" /></linearGradient>
                <linearGradient id="g-rd-me" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7a70" stopOpacity=".55" /><stop offset="1" stopColor="#c3272b" stopOpacity=".2" /></linearGradient>
              </defs>
              <PolarGrid stroke="rgba(120,100,60,.22)" />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10.5, fill: '#5f5850' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="团队均值" dataKey="team" stroke="#c9a24d" strokeWidth={1.5} fill="url(#g-rd-team)" fillOpacity={1} isAnimationActive={false} />
              <Radar name={ME.name} dataKey="me" stroke="#c3272b" strokeWidth={2} fill="url(#g-rd-me)" fillOpacity={1} dot={{ r: 2.5, fill: '#c3272b', strokeWidth: 0 }} isAnimationActive={false} />
              <Tooltip content={<ChartTip swatches={['linear-gradient(135deg,#f7e2a5,#c9a24d)', 'linear-gradient(135deg,#ff7a70,#c3272b)']} />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* 10. 决策沙盘 */}
        <Card title="决策沙盘 · 彩晟商贸处置" icon={<Scale size={15} />} cls="span2 red" right={<Link to="/scene/postloan" className="btn sm ghost">进入完整沙盘 <ChevronRight size={12} /></Link>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 14 }}>
            <div>
              <div className="legend-chips" style={{ marginBottom: 4 }}>
                {SB_SERIES.map((s) => <span key={s.key}><i style={{ background: s.sw }} />{s.name}</span>)}
                <span className="card-s">影响指数：+ 有利 / − 不利</span>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={SANDBOX} margin={{ top: 6, right: 6, bottom: 0, left: -16 }} barGap={3} barCategoryGap="28%">
                  <defs>
                    <linearGradient id="g-sb1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a70" /><stop offset="1" stopColor="#c3272b" /></linearGradient>
                    <linearGradient id="g-sb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#c9a24d" /></linearGradient>
                    <linearGradient id="g-sb3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ee3ad" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="opt" tick={{ fontSize: 11.5, fill: '#5f5850', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[-100, 100]} ticks={[-100, -50, 0, 50, 100]} tick={AXIS} axisLine={false} tickLine={false} />
                  <ReferenceLine y={0} stroke="rgba(120,100,60,.45)" />
                  <Tooltip cursor={{ fill: 'rgba(195,39,43,.06)' }} content={<ChartTip swatches={SB_SERIES.map((s) => s.sw)} />} />
                  {SB_SERIES.map((s) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={`url(#${s.grad})`} radius={[4, 4, 4, 4]} barSize={13} isAnimationActive={false} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="think">
              <div className="step"><span className="n">1</span><div><b>追加押品</b><p>要求晟禾追加存货 / 应收质押，敞口覆盖率升至 118%，客户关系温和。</p></div></div>
              <div className="step"><span className="n">2</span><div><b>压降续贷</b><p>分 3 期压降 500 万担保敞口，五级分类稳在关注类，需谈判。</p></div></div>
              <div className="step"><span className="n">3</span><div><b>提前收回</b><p>敞口清零但触发交叉违约，晟禾集团关系受损，下迁概率 +40。</p></div></div>
              <div className="ai-tag"><Wand2 size={12} /> AI 建议：<b>方案 1 + 2 组合</b>，综合得分 82 / 100</div>
            </div>
          </div>
        </Card>


        {/* 12. 本周 AI 动态 */}
        <Card title="本周 AI 赋能" icon={<Bot size={15} />} sub="企金智脑为你完成" cls="dark">
          <div className="kv grow">
            {AI_WEEK.map((a) => (
              <div key={a.k}>
                <div className="row" style={{ borderColor: 'rgba(255,255,255,.18)' }}><span>{a.k}</span><span className="num gold-text" style={{ fontSize: 15 }}>{a.v} <small style={{ fontSize: 11, fontWeight: 600 }}>{a.unit}</small></span></div>
                <div className="bar" style={{ height: 5, marginTop: 4, background: 'rgba(255,255,255,.14)' }}><i style={{ width: `${a.pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="chart-foot" style={{ color: 'rgba(255,248,232,.7)' }}>本周使用率 <b style={{ color: '#efd48a' }}>{ME_MEMBER.aiUse >= 80 ? ME_MEMBER.aiUse : 86}%</b>，位列支行前 3。</div>
        </Card>
      </div>
    </div>
  );
}
