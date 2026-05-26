import { RoleNav, type NavItem } from "@/components/nav/RoleNav";
import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import {
  LayoutDashboard,
  Wallet,
  PlusCircle,
  Cpu,
  Receipt,
  Store,
  FileText,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  const s = getStore();
  const me = getDemoEnterprise();
  const myApps = s.voucherApps.filter((a) => a.enterpriseId === me.id);
  const myVouchers = s.vouchers.filter((v) => v.enterpriseId === me.id);

  const items: NavItem[] = [
    { href: "/enterprise", label: "工作台", icon: <LayoutDashboard className="w-full h-full" /> },
    { href: "/enterprise/vouchers", label: "我的券包", icon: <Wallet className="w-full h-full" />, group: "券务", badge: myVouchers.filter((v) => v.status === "ACTIVE").length },
    { href: "/enterprise/apply", label: "申请用券", icon: <PlusCircle className="w-full h-full" />, group: "券务" },
    { href: "/enterprise/models", label: "Model Hub", icon: <Cpu className="w-full h-full" />, group: "调用" },
    { href: "/enterprise/usage", label: "用量与账单", icon: <Receipt className="w-full h-full" />, group: "调用" },
    { href: "/enterprise/market", label: "应用市场", icon: <Store className="w-full h-full" />, group: "生态" },
    { href: "/enterprise/policies", label: "政策匹配", icon: <FileText className="w-full h-full" />, group: "生态" },
    { href: "/enterprise/matching", label: "需求撮合", icon: <HeartHandshake className="w-full h-full" />, group: "生态" },
    { href: "/enterprise/profile", label: "企业信息", icon: <ShieldCheck className="w-full h-full" />, group: "账户" },
  ];

  return (
    <RoleNav
      role="enterprise"
      items={items}
      identity={{ name: me.contact, orgName: me.name.slice(0, 12) }}
      searchPlaceholder="搜索模型 / 应用 / 政策..."
    >
      {children}
    </RoleNav>
  );
}
