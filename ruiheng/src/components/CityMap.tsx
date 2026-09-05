import { useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { X, ShieldAlert, UserRoundSearch } from 'lucide-react';
import { COMPANIES, type Company, type Risk } from '../data/companies';
import { PERSONAS } from '../data/personas';
import { CITY, MAP_W, MAP_H, toPx, heatStops, RISK_GRAD, RISK_LABEL, PAL } from '../lib/cityMap';
import { fmtWan, fmtYi } from '../lib/rng';

type Hover = { kind: 'company'; id: string } | { kind: 'district'; id: string } | { kind: 'cluster'; id: string } | null;

interface Props { selected: string | null; onSelect: (id: string | null) => void }

const RISK_CHIP: Record<Risk, string> = { red: 'red', orange: 'orange', yellow: '', green: 'green' };
const ownerName = (id: string) => PERSONAS.find((p) => p.id === id)?.name ?? id;
const markerR = (c: Company) => 7 + Math.sqrt(c.settlement) / 22;

export default function CityMap({ selected, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const track = (e: MouseEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const sel = selected ? COMPANIES.find((c) => c.id === selected) ?? null : null;
  const open = !!sel;
  const totalExp = COMPANIES.reduce((s, c) => s + c.exposure, 0);
  const totalDep = COMPANIES.reduce((s, c) => s + c.deposit, 0);

  // tooltip 内容
  let tip: React.ReactNode = null;
  if (hover?.kind === 'company') {
    const c = COMPANIES.find((x) => x.id === hover.id);
    if (c) tip = (
      <>
        <div className="tip-h"><i className={`rk ${c.risk}`} /><b>{c.name}</b><span className={`chip ${RISK_CHIP[c.risk]}`}>{RISK_LABEL[c.risk]}</span></div>
        <div className="tip-s">{c.industry} · {c.district} · 客户经理 {ownerName(c.owner)}</div>
        <div className="tip-s">{c.relation}</div>
        <div className="tip-kv"><span>敞口 <b className="num">{fmtWan(c.exposure)}</b></span><span>存款 <b className="num">{fmtWan(c.deposit)}</b></span><span>结算 <b className="num">{fmtWan(c.settlement)}</b></span></div>
        <div className="tip-tags">{c.tags.map((t) => <span key={t} className="chip iris">{t}</span>)}</div>
      </>
    );
  } else if (hover?.kind === 'district') {
    const d = CITY.districts.find((x) => x.id === hover.id);
    if (d) tip = (
      <>
        <div className="tip-h"><b>{d.name}</b><span className="chip">行政区</span></div>
        <div className="tip-kv"><span>本行敞口 <b className="num">{fmtYi(d.exposure)}</b></span><span>存款 <b className="num">{fmtYi(d.deposit)}</b></span><span>客户 <b className="num">{d.customers} 户</b></span></div>
        <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.round(d.heat * 100)}%` }} /></div>
      </>
    );
  } else if (hover?.kind === 'cluster') {
    const cl = CITY.clusters.find((x) => x.id === hover.id);
    if (cl) tip = (
      <>
        <div className="tip-h"><i className="rk" style={{ background: cl.color }} /><b>{cl.name}产业集群</b></div>
        <div className="tip-s">{cl.note}</div>
        <div className="tip-s">集群内本行客户 {COMPANIES.filter((c) => c.industry === cl.name).length} 户</div>
      </>
    );
  }

  const tipStyle = box.current
    ? { left: Math.min(pos.x + 14, box.current.clientWidth - 250), top: Math.max(8, pos.y - 12) }
    : { left: pos.x + 14, top: pos.y - 12 };

  return (
    <div className="cmap" ref={box}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="cmap-svg" preserveAspectRatio="xMidYMid meet" onMouseMove={track} onMouseLeave={() => setHover(null)}
        onClick={() => onSelect(null)}>
        <defs>
          <clipPath id="cm-clip"><path d={CITY.outline} /></clipPath>
          <linearGradient id="cm-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fffaf0" /><stop offset=".5" stopColor="#f6f0e2" /><stop offset="1" stopColor="#eef5ef" />
          </linearGradient>
          <linearGradient id="cm-sea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#eaf3ff" stopOpacity=".9" /><stop offset="1" stopColor="#dff5f0" stopOpacity=".9" />
          </linearGradient>
          {CITY.districts.map((d) => {
            const h = heatStops(d.heat);
            return (
              <linearGradient key={d.id} id={`cm-${d.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={h.c1} stopOpacity={h.o1} /><stop offset="1" stopColor={h.c2} stopOpacity={h.o2} />
              </linearGradient>
            );
          })}
          {CITY.clusters.map((cl) => (
            <radialGradient key={cl.id} id={`cm-cl-${cl.id}`}>
              <stop offset="0" stopColor="#ffffff" stopOpacity=".55" /><stop offset=".35" stopColor={cl.color} stopOpacity=".42" />
              <stop offset=".8" stopColor={cl.color} stopOpacity=".16" /><stop offset="1" stopColor={cl.color} stopOpacity="0" />
            </radialGradient>
          ))}
          {(Object.keys(RISK_GRAD) as Risk[]).map((k) => (
            <radialGradient key={k} id={`cm-rk-${k}`} cx=".35" cy=".3" r=".8">
              <stop offset="0" stopColor={RISK_GRAD[k][0]} /><stop offset="1" stopColor={RISK_GRAD[k][1]} />
            </radialGradient>
          ))}
          <linearGradient id="cm-river" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8fd3ff" /><stop offset=".5" stopColor={PAL.c4} /><stop offset="1" stopColor={PAL.c7} />
          </linearGradient>
          <linearGradient id="cm-road" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff3cf" /><stop offset=".5" stopColor="#e6c98a" /><stop offset="1" stopColor="#c9a24d" />
          </linearGradient>
          <linearGradient id="cm-sel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={PAL.c2} /><stop offset="1" stopColor={PAL.c1} />
          </linearGradient>
          <filter id="cm-shadow" x="-10%" y="-10%" width="120%" height="125%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#5c4014" floodOpacity=".18" />
          </filter>
          <filter id="cm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#cm-sea)" rx="18" />
        {/* 经纬网 */}
        <g stroke="rgba(58,134,255,.12)" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={(i + 1) * 100} y1="0" x2={(i + 1) * 100} y2={MAP_H} />)}
          {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="0" y1={(i + 1) * 100} x2={MAP_W} y2={(i + 1) * 100} />)}
        </g>

        <g className={`cm-world${open ? ' open' : ''}`}>
          <path d={CITY.outline} fill="url(#cm-land)" stroke="rgba(201,162,77,.6)" strokeWidth="2.5" filter="url(#cm-shadow)" />
          <g clipPath="url(#cm-clip)">
            {/* 行政区（按本行敞口热力填充） */}
            {CITY.districts.map((d) => (
              <path key={d.id} d={d.path} fill={`url(#cm-${d.id})`} stroke="rgba(255,255,255,.95)" strokeWidth="2.2" strokeLinejoin="round"
                className={`cm-dist${hover?.kind === 'district' && hover.id === d.id ? ' on' : ''}`}
                onMouseEnter={() => setHover({ kind: 'district', id: d.id })} onMouseLeave={() => setHover(null)} />
            ))}
            {/* 河流：衡江 */}
            <path d={CITY.river} fill="none" stroke="#ffffff" strokeWidth="18" strokeOpacity=".8" strokeLinecap="round" />
            <path d={CITY.river} fill="none" stroke="url(#cm-river)" strokeWidth="12" strokeLinecap="round" strokeOpacity=".85" />
            <path d={CITY.river} fill="none" stroke="#ffffff" strokeWidth="2.5" strokeOpacity=".7" strokeDasharray="14 22" strokeLinecap="round" className="cm-flow" />
            {/* 主干道 */}
            {CITY.roads.map((rd) => (
              <g key={rd.id}>
                <path d={rd.path} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth={rd.major ? 9 : 7} strokeLinecap="round" />
                <path d={rd.path} fill="none" stroke="url(#cm-road)" strokeWidth={rd.major ? 5.5 : 4} strokeLinecap="round" />
                <path d={rd.path} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="1.2" strokeDasharray="10 8" />
              </g>
            ))}
            {/* 产业集群气泡 */}
            {CITY.clusters.map((cl) => (
              <g key={cl.id} className="cm-cluster" onMouseEnter={() => setHover({ kind: 'cluster', id: cl.id })} onMouseLeave={() => setHover(null)}>
                <circle cx={cl.cx} cy={cl.cy} r={cl.r} fill={`url(#cm-cl-${cl.id})`} stroke={cl.color} strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="4 5" />
                <text x={cl.cx} y={cl.cy + cl.r + 13} textAnchor="middle" className="cm-cl-label" style={{ fill: cl.color }}>{cl.name}</text>
              </g>
            ))}
          </g>
          {/* 行政区名 */}
          {CITY.districts.map((d) => (
            <g key={d.id} className="cm-dlabel" pointerEvents="none">
              <text x={d.seed[0]} y={d.seed[1] - 2} textAnchor="middle" className="cm-dname">{d.name}</text>
              <text x={d.seed[0]} y={d.seed[1] + 13} textAnchor="middle" className="cm-dval">敞口 {fmtYi(d.exposure)}</text>
            </g>
          ))}
          {/* 河流 / 道路名 */}
          <text x={120} y={272} className="cm-water" transform="rotate(38 120 272)">衡 江</text>
          <text x={740} y={262} className="cm-roadname">衡山大道</text>
          <text x={470} y={150} className="cm-roadname" transform="rotate(84 470 150)">远山路</text>

          {/* 客户标记 */}
          {COMPANIES.map((c) => {
            const [x, y] = toPx(c.x, c.y);
            const rr = markerR(c);
            const isSel = selected === c.id;
            const isHov = hover?.kind === 'company' && hover.id === c.id;
            return (
              <g key={c.id} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`} className={`cm-mk${isSel ? ' sel' : ''}`}
                onMouseEnter={() => setHover({ kind: 'company', id: c.id })} onMouseLeave={() => setHover(null)}
                onClick={(e) => { e.stopPropagation(); onSelect(isSel ? null : c.id); }}>
                {c.risk === 'red' && (
                  <>
                    <circle r={rr} fill={RISK_GRAD.red[0]} opacity=".7">
                      <animate attributeName="r" values={`${rr};${rr + 18};${rr}`} dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values=".7;0;.7" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                    <circle r={rr} fill="none" stroke={RISK_GRAD.red[1]} strokeWidth="1.5" opacity=".6">
                      <animate attributeName="r" values={`${rr + 4};${rr + 26};${rr + 4}`} dur="1.6s" begin=".4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values=".6;0;.6" dur="1.6s" begin=".4s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
                {c.risk === 'orange' && <circle r={rr + 6} fill={RISK_GRAD.orange[0]} opacity=".22" />}
                {(isSel || isHov) && <circle r={rr + 7} fill="none" stroke="url(#cm-sel)" strokeWidth="2.5" strokeDasharray="5 4" className="cm-ring" />}
                <circle r={rr} fill={`url(#cm-rk-${c.risk})`} stroke="#fff" strokeWidth="2.5" filter="url(#cm-glow)" />
                {c.exposure > 0 && <circle r={2.4} fill="#fff" />}
                <text x={rr + 6} y={4} className="cm-mkname">{c.name}</text>
              </g>
            );
          })}
        </g>
      </svg>

      {tip && <div className="cmap-tip" style={tipStyle}>{tip}</div>}

      {/* 图例 */}
      <div className="cmap-legend">
        <div className="lg-row">{(['red', 'orange', 'yellow', 'green'] as Risk[]).map((k) => <span key={k}><i className={`rk ${k}`} />{RISK_LABEL[k]}</span>)}</div>
        <div className="lg-row"><i className="lg-heat" /><span>本行敞口 低 → 高</span></div>
        <div className="lg-row"><i className="lg-bubble" /><span>产业集群</span><i className="lg-river" /><span>衡江</span><i className="lg-road" /><span>主干道</span></div>
      </div>

      <div className="cmap-badge">远山市 · {CITY.districts.length} 个行政区 · {COMPANIES.length} 户重点客户 · 敞口 {fmtYi(totalExp)} / 存款 {fmtYi(totalDep)}</div>

      {/* 右侧详情面板 */}
      {sel && (
        <div className="cmap-panel fade-in">
          <button className="pn-x" onClick={() => onSelect(null)} aria-label="关闭"><X size={14} /></button>
          <div className="pn-h"><i className={`rk ${sel.risk}`} /><b>{sel.name}</b></div>
          <div className="pn-s">{sel.industry} · {sel.district}</div>
          <div className="pn-chips"><span className={`chip ${RISK_CHIP[sel.risk]}`}><i />{RISK_LABEL[sel.risk]}</span>{sel.tags.map((t) => <span key={t} className="chip iris">{t}</span>)}</div>
          <div className="kv">
            <div className="row"><span>客户关系</span><span>{sel.relation}</span></div>
            <div className="row"><span>客户经理</span><span>{ownerName(sel.owner)}</span></div>
            <div className="row"><span>本行敞口</span><span className="num red-text">{fmtWan(sel.exposure)}</span></div>
            <div className="row"><span>存款余额</span><span className="num green-text">{fmtWan(sel.deposit)}</span></div>
            <div className="row"><span>年结算量</span><span className="num">{fmtWan(sel.settlement)}</span></div>
          </div>
          <p className="pn-note">{sel.note}</p>
          <div className="pn-act">
            <Link className="btn sm" to="/scene/postloan"><ShieldAlert size={13} /> 贷后哨兵</Link>
            <Link className="btn sm gold" to="/scene/profile"><UserRoundSearch size={13} /> 客户画像</Link>
          </div>
        </div>
      )}
    </div>
  );
}
