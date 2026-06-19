import { NavLink } from 'react-router-dom';
import {
  Home, ClipboardList, CalendarRange, Boxes, Lock, Activity, AlertTriangle, Wallet, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MenuItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  star?: boolean;
}

// §4.1 一级菜单(9 个业务入口 + 1 个系统设置)
const PRIMARY: MenuItem[] = [
  { to: '/dashboard',      label: '工作台',          Icon: Home,           star: true },
  { to: '/work-orders',    label: '工单管理',        Icon: ClipboardList },
  { to: '/schedule',       label: '智能排产',        Icon: CalendarRange,  star: true },
  { to: '/material-check', label: '物料齐套',        Icon: Boxes },
  { to: '/inventory-lock', label: '库存锁定',        Icon: Lock },
  { to: '/capacity',       label: '产能负荷分析',    Icon: Activity },
  { to: '/alerts',         label: '异常预警中心',    Icon: AlertTriangle },
  { to: '/cost',           label: '成本核算',        Icon: Wallet,         star: true },
];

const SETTINGS: MenuItem = { to: '/settings', label: '系统设置', Icon: Settings };

function Item({ item }: { item: MenuItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 h-10 px-4 text-[13px] relative transition-colors
         ${isActive
           ? 'bg-line/50 text-white font-semibold'
           : 'text-ink-dim hover:bg-line/30 hover:text-ink'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-gradient-to-b from-brand to-ai" />
          )}
          <item.Icon size={17} className="flex-none" />
          <span className="truncate">{item.label}</span>
          {item.star && (
            <span className="ml-auto text-[9px] font-bold tracking-wider text-brand">★</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function SideMenu() {
  return (
    <aside className="flex-none w-56 border-r border-line bg-card flex flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        {PRIMARY.map((it) => (
          <Item key={it.to} item={it} />
        ))}
      </div>
      <div className="border-t border-line py-2">
        <Item item={SETTINGS} />
      </div>
      <div className="p-3 text-[10px] text-ink-faint border-t border-line leading-relaxed">
        APS Demo <b className="text-ink-dim">v2</b><br />
        计划版本 V0715-1 · 11:46
      </div>
    </aside>
  );
}
