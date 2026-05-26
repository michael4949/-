import { RoleNav, type NavItem } from "@/components/nav/RoleNav";
import { getStore } from "@/lib/data/store";
import { getDemoProvider } from "@/lib/data/personas";
import { LayoutDashboard, Cpu, Activity, ServerCog, Store, Receipt, Users, Sparkles } from "lucide-react";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const provider = getDemoProvider();

  const items: NavItem[] = [
    { href: "/provider", label: "工作台", icon: <LayoutDashboard className="w-full h-full" /> },
    { href: "/provider/models", label: "我的模型", icon: <Cpu className="w-full h-full" />, group: "服务" },
    { href: "/provider/usage", label: "调用统计", icon: <Activity className="w-full h-full" />, group: "服务" },
    { href: "/provider/compute", label: "算力资源", icon: <ServerCog className="w-full h-full" />, group: "服务" },
    { href: "/provider/apps", label: "应用市场", icon: <Store className="w-full h-full" />, group: "生态" },
    { href: "/provider/customers", label: "客户企业", icon: <Users className="w-full h-full" />, group: "生态" },
    { href: "/provider/settlement", label: "对账结算", icon: <Receipt className="w-full h-full" />, group: "财务" },
  ];

  return (
    <RoleNav
      role="provider"
      items={items}
      identity={{ name: provider.contact, orgName: provider.vendor }}
      searchPlaceholder="搜索客户 / 模型 / 应用..."
    >
      {children}
    </RoleNav>
  );
}
