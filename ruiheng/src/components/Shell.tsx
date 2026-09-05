import { NavLink, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { PRODUCTS, productById } from '../data/products';
import { PERSONAS } from '../data/personas';

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] ?? Icons.Circle;
  return <C size={size} />;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const me = PERSONAS[1];
  const pid = loc.pathname.startsWith('/p/') ? loc.pathname.split('/')[2] : undefined;
  const NAMES: Record<string, string> = { '/': '首页驾驶舱', '/scenes': '一天的故事线', '/map': '能力地图', '/deploy': '部署 · 数据 · 合规', '/pathways': '合作路径与 POC', '/scene/postloan': '早会晨报 · 贷后风险哨兵', '/scene/visit': '尽调拜访准备', '/scene/fin': '财务智能诊断', '/scene/credit': '授信智能工作台', '/scene/group': '集团客户作战室', '/scene/sparring': '智能陪练底座', '/scene/profile': '能力画像与成长' };
  const crumb = pid ? productById(pid)?.name : NAMES[loc.pathname] ?? '示范场景';
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="mark serif">衡</div>
          <div>
            <b className="iris-text">睿衡</b>
            <span>企业金融智能赋能中枢</span>
          </div>
        </div>
        <div className="nav-cap">总 览</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="ico"><Icons.LayoutDashboard size={15} /></span>首页驾驶舱
        </NavLink>
        <NavLink to="/scenes" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="ico"><Icons.Clapperboard size={15} /></span>一天的故事线
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="ico"><Icons.Grid3x3 size={15} /></span>能力地图 <span className="cnt">688</span>
        </NavLink>
        <div className="nav-cap">智 能 产 品</div>
        {PRODUCTS.map((p) => (
          <NavLink key={p.id} to={p.route} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="ico"><Icon name={p.icon} size={15} /></span>{p.name}
          </NavLink>
        ))}
        <div className="nav-cap">平 台</div>
        <NavLink to="/deploy" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="ico"><Icons.ServerCog size={15} /></span>部署 · 数据 · 合规
        </NavLink>
        <NavLink to="/pathways" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="ico"><Icons.Handshake size={15} /></span>合作路径与 POC
        </NavLink>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="crumb">睿衡 › <b>{crumb}</b></div>
          <div className="spacer" />
          <div className="search"><Icons.Search size={14} /> 搜索客户、功能、制度……（试试"票据"）</div>
          <div className="chip green"><i />当前模式：本机模型 · 无外联</div>
          <div className="avatar"><div className="av">{me.avatar}</div><div><b>{me.name}</b><br /><span>{me.org.split('·')[1]}</span></div></div>
        </div>
        <div className="content">{children}</div>
      </div>
      <div className="wm">演示数据均为虚构 · 原型 v0.1</div>
    </div>
  );
}
