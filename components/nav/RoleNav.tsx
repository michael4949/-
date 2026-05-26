"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronDown, Bell, Search } from "lucide-react";
import { useState } from "react";
import { CITY_NAME } from "@/lib/constants";

type RoleKey = "gov" | "enterprise" | "provider" | "operator";

const ROLE_META: Record<RoleKey, { name: string; subtitle: string; color: string; gradient: string; portal: string }> = {
  gov: { name: "政府监管端", subtitle: "Government Console", color: "#1d4ed8", gradient: "from-blue-600 to-indigo-700", portal: "/gov" },
  enterprise: { name: "企业用户端", subtitle: "Enterprise Workspace", color: "#0891b2", gradient: "from-cyan-600 to-blue-600", portal: "/enterprise" },
  provider: { name: "AI 服务商端", subtitle: "Provider Portal", color: "#7e22ce", gradient: "from-purple-600 to-pink-600", portal: "/provider" },
  operator: { name: "平台运营端", subtitle: "Operator Backstage", color: "#047857", gradient: "from-emerald-600 to-teal-700", portal: "/operator" },
};

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  group?: string;
}

interface RoleNavProps {
  role: RoleKey;
  items: NavItem[];
  children: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle?: string;
  pageDesc?: string;
  searchPlaceholder?: string;
  identity?: { name: string; orgName: string };
}

export function RoleNav({ role, items, children, breadcrumb = [], pageTitle, pageDesc, searchPlaceholder = "搜索...", identity }: RoleNavProps) {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const meta = ROLE_META[role];

  // group items
  const grouped = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group || "main";
    (acc[g] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-[220px] bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800 flex-shrink-0">
          <div className={cn("w-8 h-8 rounded bg-gradient-to-br flex items-center justify-center", meta.gradient)}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white font-medium leading-tight truncate">{CITY_NAME} AI 运营平台</div>
            <div className="text-[10px] text-slate-500 truncate">{meta.subtitle}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {Object.entries(grouped).map(([group, gitems]) => (
            <div key={group} className="mb-4 last:mb-0">
              {group !== "main" && (
                <div className="px-4 mb-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{group}</div>
              )}
              {gitems.map((it) => {
                const active = pathname === it.href || (it.href !== meta.portal && pathname?.startsWith(it.href));
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors relative",
                      active
                        ? "bg-slate-800/80 text-white"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: meta.color }} />
                    )}
                    <span className="w-4 h-4 flex-shrink-0">{it.icon}</span>
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.badge !== undefined && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 rounded font-medium",
                          it.badgeColor || "bg-red-500/20 text-red-300",
                        )}
                      >
                        {it.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed flex-shrink-0">
          <div>滨海市数据局 ©</div>
          <div className="text-slate-600">v 1.0.0-demo</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center gap-4 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-slate-500 flex-1 min-w-0">
            {breadcrumb.length > 0 ? (
              breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center">
                  {b.href ? (
                    <Link href={b.href} className="hover:text-slate-900">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={i === breadcrumb.length - 1 ? "text-slate-900 font-medium" : ""}>{b.label}</span>
                  )}
                  {i < breadcrumb.length - 1 && <span className="mx-2 text-slate-300">/</span>}
                </span>
              ))
            ) : (
              <span className="text-slate-900 font-medium">{meta.name}</span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded w-[240px] focus:outline-none focus:bg-white focus:border-slate-300"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-slate-100 rounded">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {/* Role switcher */}
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded hover:bg-slate-100 transition-colors"
            >
              <div
                className={cn("w-7 h-7 rounded bg-gradient-to-br flex items-center justify-center text-white text-xs font-medium", meta.gradient)}
              >
                {identity?.name?.[0] || meta.name[0]}
              </div>
              <div className="text-left">
                <div className="text-xs font-medium text-slate-700 leading-tight">{identity?.name || "演示账号"}</div>
                <div className="text-[10px] text-slate-500">{identity?.orgName || meta.name}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-[260px] bg-white shadow-xl border border-slate-200 rounded-md p-1.5 z-20">
                  <div className="px-2.5 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider">切换角色端</div>
                  {(Object.keys(ROLE_META) as RoleKey[]).map((k) => {
                    const m = ROLE_META[k];
                    return (
                      <Link
                        key={k}
                        href={m.portal}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded hover:bg-slate-50",
                          k === role && "bg-slate-50",
                        )}
                        onClick={() => setSwitcherOpen(false)}
                      >
                        <div className={cn("w-8 h-8 rounded bg-gradient-to-br flex items-center justify-center text-white", m.gradient)}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-800">{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.subtitle}</div>
                        </div>
                        {k === role && <span className="text-[10px] text-emerald-600 font-medium">当前</span>}
                      </Link>
                    );
                  })}
                  <div className="border-t border-slate-100 mt-1.5 pt-1.5">
                    <Link href="/screen" className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-700" onClick={() => setSwitcherOpen(false)}>
                      <Sparkles className="w-4 h-4 text-cyan-600" />
                      城市运行大屏
                    </Link>
                    <Link href="/" className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-700" onClick={() => setSwitcherOpen(false)}>
                      <Sparkles className="w-4 h-4 text-slate-500" />
                      返回首页
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page header */}
        {(pageTitle || pageDesc) && (
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-end justify-between">
              <div>
                {pageTitle && <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{pageTitle}</h1>}
                {pageDesc && <p className="text-sm text-slate-500 mt-1">{pageDesc}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
