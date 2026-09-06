import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { PRODUCTS, productById } from '../data/products';
import { PERSONAS } from '../data/personas';
import { COMPANIES } from '../data/companies';
import capabilities from '../data/capabilities.json';
import type { Catalog, ProductFunction } from '../data/types';
import NavIcon from './NavIcon';
import AmbientBackground from './AmbientBackground';

const CATALOG = capabilities as Catalog;
export const FUNCTIONS: ProductFunction[] = CATALOG.functions;
export const fnById = (id: string) => FUNCTIONS.find((f) => f.id === id);
export const fnsOf = (pid: string) => FUNCTIONS.filter((f) => f.product === pid);

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] ?? Icons.Circle;
  return <C size={size} />;
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase(); if (!s) return { fns: [] as ProductFunction[], cos: [] as typeof COMPANIES };
    return {
      fns: FUNCTIONS.filter((f) => f.name.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s) || f.panels.some((p) => p.toLowerCase().includes(s))).slice(0, 8),
      cos: COMPANIES.filter((c) => c.name.includes(s) || c.industry.includes(s) || c.tags.some((t) => t.includes(s))).slice(0, 5),
    };
  }, [q]);
  return (
    <div className="search gsearch" ref={box}>
      <Icons.Search size={14} />
      <input value={q} placeholder="搜索客户、功能、制度……" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && q.trim() && (
        <div className="drop">
          {hits.cos.length > 0 && <div className="cap">客 户</div>}
          {hits.cos.map((c) => <div key={c.id} className="it" onClick={() => { setOpen(false); setQ(''); nav('/f/F-KH-007'); }}><span className={`chip ${c.risk === 'red' ? 'red' : c.risk === 'orange' ? 'orange' : c.risk === 'yellow' ? '' : 'green'}`}><i />{c.industry}</span>{c.name}<small>{c.relation}</small></div>)}
          {hits.fns.length > 0 && <div className="cap">功 能</div>}
          {hits.fns.map((f) => <div key={f.id} className="it" onClick={() => { setOpen(false); setQ(''); nav(`/f/${f.id}`); }}><NavIcon name={productById(f.product)?.icon ?? 'Circle'} tone={productById(f.product)?.tone} size={12} />{f.name}<small>{productById(f.product)?.name}</small></div>)}
          {hits.cos.length === 0 && hits.fns.length === 0 && <div className="it"><Icons.Sparkles size={14} />没有找到，试试"授信""预警""集团"</div>}
        </div>
      )}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const me = PERSONAS[1];
  const fid = loc.pathname.startsWith('/f/') ? decodeURIComponent(loc.pathname.split('/')[2] ?? '') : undefined;
  const fn = fid ? fnById(fid) : undefined;
  const activePid = fn?.product;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { if (activePid) setOpen((o) => ({ ...o, [activePid]: true })); }, [activePid]);
  const toggle = (pid: string) => setOpen((o) => ({ ...o, [pid]: !o[pid] }));
  const crumb = fn ? <>{productById(fn.product)?.name} › <b>{fn.name}</b></> : <b>首页驾驶舱</b>;

  return (
    <>
      <AmbientBackground />
      <div className="shell">
        <aside className="side">
          <div className="brand">
            <div className="mark serif">智</div>
            <div>
              <b className="iris-text">企金智脑</b>
              <span>企业金融客户经理 AI 助手平台</span>
            </div>
          </div>
          <div className="nav-cap">总 览</div>
          <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {({ isActive }) => <><NavIcon name="LayoutDashboard" tone="iris" active={isActive} />首页驾驶舱</>}
          </NavLink>
          <div className="nav-cap">智 能 产 品</div>
          {PRODUCTS.map((p) => {
            const fns = fnsOf(p.id);
            const isOpen = !!open[p.id];
            const isGroupActive = activePid === p.id;
            return (
              <div key={p.id} className={`nav-group${isOpen ? ' open' : ''}`}>
                <div className={`nav-item${isGroupActive ? ' group-active' : ''}`} onClick={() => toggle(p.id)}>
                  <NavIcon name={p.icon} tone={p.tone} active={isGroupActive} />{p.name}
                  <span className="cnt">{fns.length}</span>
                  <Icons.ChevronRight size={14} className="chev" />
                </div>
                <div className="nav-sub">
                  {fns.map((f) => (
                    <NavLink key={f.id} to={`/f/${f.id}`} className={({ isActive }) => `nav-fn${isActive ? ' active' : ''}`}>{f.name}</NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>
        <div className="main">
          <div className="topbar">
            <div className="crumb">企金智脑 › {crumb}</div>
            <div className="spacer" />
            <GlobalSearch />
            <div className="chip green"><i />AI 引擎 · 行内私有化 · 在线</div>
            <div className="avatar"><div className="av">{me.avatar}</div><div><b>{me.name}</b><br /><span>{me.org.split('·')[1]}</span></div></div>
          </div>
          <div className="content">{children}</div>
        </div>
      </div>
    </>
  );
}
