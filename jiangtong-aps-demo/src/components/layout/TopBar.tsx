import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User2 } from 'lucide-react';
import { ROLES, useUserStore, type Role } from '../../store/useUserStore';

export default function TopBar() {
  const { name, role, setRole } = useUserStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="h-14 flex-none flex items-center gap-4 px-5 border-b border-line bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-600 flex items-center justify-center font-bold text-white text-[13px] shadow-sm">
          JT
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-wide">江铜 APS</div>
          <div className="text-[10px] text-ink-faint tracking-[2px]">高级计划与排产</div>
        </div>
      </div>

      {/* 全局搜索 */}
      <div className="relative ml-4 w-80">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          placeholder="搜索工单 / 物料 / 资源…"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-panel2 border border-line text-[12.5px]
                     placeholder:text-ink-faint outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-card"
        />
      </div>

      {/* 右侧：角色 / 通知 / 头像 */}
      <div className="ml-auto flex items-center gap-2" ref={ref}>
        {/* 角色切换 */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 h-9 px-3 rounded-lg bg-panel2 border border-line
                       hover:border-line-soft text-[12.5px]"
          >
            <span className="text-ink-dim">角色:</span>
            <span className="font-semibold">
              {role} {name}
            </span>
            <ChevronDown size={14} className="text-ink-faint" />
          </button>
          {open && (
            <div
              className="absolute right-0 mt-1 w-44 rounded-lg bg-card border border-line shadow-card z-50 py-1"
            >
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r as Role);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg
                              ${r === role ? 'text-brand font-semibold' : 'text-ink'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 通知 */}
        <button
          className="relative w-9 h-9 rounded-lg hover:bg-bg flex items-center justify-center"
          title="通知"
        >
          <Bell size={16} className="text-ink-dim" />
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white
                           text-[9px] font-bold flex items-center justify-center border-2 border-card">
            3
          </span>
        </button>

        {/* 头像 */}
        <button className="w-9 h-9 rounded-full bg-gradient-to-br from-brand/80 to-ai/80
                          flex items-center justify-center text-white text-[12px] font-bold"
                title={`${role} ${name}`}>
          <User2 size={16} />
        </button>
      </div>
    </header>
  );
}
