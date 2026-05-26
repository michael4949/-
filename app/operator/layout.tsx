import { RoleNav, type NavItem } from "@/components/nav/RoleNav";
import { getStore } from "@/lib/data/store";
import { getDemoOperator } from "@/lib/data/personas";
import {
  LayoutDashboard,
  ClipboardCheck,
  HeartHandshake,
  Megaphone,
  AlertTriangle,
  Cpu,
  Store,
} from "lucide-react";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const s = getStore();
  const op = getDemoOperator();
  const pending = s.voucherApps.filter((a) => a.status === "PENDING").length;
  const pendingModels = s.models.filter((m) => m.status === "BETA").length;
  const pendingApps = s.apps.filter((a) => a.status === "PENDING").length;
  const openMatches = s.matches.filter((m) => m.status === "OPEN").length;
  const alerts = s.alerts.filter((a) => !a.acked).length;

  const items: NavItem[] = [
    { href: "/operator", label: "工作台", icon: <LayoutDashboard className="w-full h-full" /> },
    { href: "/operator/audit", label: "企业审核", icon: <ClipboardCheck className="w-full h-full" />, group: "审核", badge: pending },
    { href: "/operator/model-review", label: "模型审核", icon: <Cpu className="w-full h-full" />, group: "审核", badge: pendingModels },
    { href: "/operator/app-review", label: "应用上架审核", icon: <Store className="w-full h-full" />, group: "审核", badge: pendingApps },
    { href: "/operator/match", label: "需求撮合", icon: <HeartHandshake className="w-full h-full" />, group: "运营", badge: openMatches },
    { href: "/operator/activities", label: "运营活动", icon: <Megaphone className="w-full h-full" />, group: "运营" },
    { href: "/operator/alerts", label: "系统告警", icon: <AlertTriangle className="w-full h-full" />, group: "运维", badge: alerts, badgeColor: "bg-amber-500/20 text-amber-300" },
  ];

  return (
    <RoleNav
      role="operator"
      items={items}
      identity={{ name: op.name, orgName: op.team }}
      searchPlaceholder="搜索企业 / 模型 / 应用 / 需求..."
    >
      {children}
    </RoleNav>
  );
}
