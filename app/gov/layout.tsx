import { RoleNav, type NavItem } from "@/components/nav/RoleNav";
import { getStore } from "@/lib/data/store";
import {
  LayoutDashboard,
  Wallet,
  ClipboardCheck,
  Building2,
  ServerCog,
  Cpu,
  FileText,
  BarChart3,
  Receipt,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

export default function GovLayout({ children }: { children: React.ReactNode }) {
  const store = getStore();
  const pending = store.voucherApps.filter((a) => a.status === "PENDING").length;
  const alerts = store.alerts.filter((a) => !a.acked && (a.level === "CRITICAL" || a.level === "WARN")).length;

  const items: NavItem[] = [
    { href: "/gov", label: "概览驾驶舱", icon: <LayoutDashboard className="w-full h-full" /> },
    { href: "/gov/vouchers", label: "券务中心", icon: <Wallet className="w-full h-full" />, group: "券务" },
    { href: "/gov/applications", label: "申请审批", icon: <ClipboardCheck className="w-full h-full" />, group: "券务", badge: pending },
    { href: "/gov/enterprises", label: "企业管理", icon: <Building2 className="w-full h-full" />, group: "主体" },
    { href: "/gov/compute", label: "算力一张图", icon: <ServerCog className="w-full h-full" />, group: "资源" },
    { href: "/gov/models", label: "模型注册表", icon: <Cpu className="w-full h-full" />, group: "资源" },
    { href: "/gov/policies", label: "政策中心", icon: <FileText className="w-full h-full" />, group: "治理" },
    { href: "/gov/analytics", label: "BI 分析中心", icon: <BarChart3 className="w-full h-full" />, group: "洞察" },
    { href: "/gov/forecast", label: "趋势预测", icon: <TrendingUp className="w-full h-full" />, group: "洞察" },
    { href: "/gov/settlement", label: "政企对账", icon: <Receipt className="w-full h-full" />, group: "财务" },
    { href: "/gov/alerts", label: "风险告警", icon: <AlertTriangle className="w-full h-full" />, group: "治理", badge: alerts, badgeColor: "bg-amber-500/20 text-amber-300" },
  ];

  return (
    <RoleNav
      role="gov"
      items={items}
      identity={{ name: "陈监管", orgName: "滨海市经信委" }}
      searchPlaceholder="搜索企业 / 券号 / 政策..."
    >
      {children}
    </RoleNav>
  );
}
