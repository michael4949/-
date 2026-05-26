import { getStore } from "@/lib/data/store";
import { CITY_NAME } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency } from "@/lib/utils";
import { TourClient } from "./TourClient";

export default function TourPage() {
  const s = getStore();
  const totalCards = s.computeCenters.reduce((sum, c) => sum + c.totalCards, 0);

  const stats = {
    enterprises: s.enterprises.length,
    certified: s.enterprises.filter((e) => e.certified).length,
    activeEnterprises: s.kpi.monthlyActiveEnterprises,
    totalToken: s.kpi.totalTokenConsumed,
    ytdSubsidy: s.kpi.ytdSubsidy,
    yesterdayCalls: s.kpi.yesterdayCalls,
    models: s.models.length,
    domesticModels: s.models.filter((m) => m.isDomestic).length,
    computeCenters: s.computeCenters.length,
    totalCards,
    tflops: Math.floor(s.computeCenters.reduce((sum, c) => sum + c.totalTflops, 0) / 1000),
    avgUtil: s.computeCenters.reduce((sum, c) => sum + c.utilization * c.totalCards, 0) / totalCards,
    pendingApps: s.voucherApps.filter((a) => a.status === "PENDING").length,
    vouchers: s.vouchers.length,
    apps: s.apps.length,
    matches: s.matches.filter((m) => m.status === "OPEN").length,
    alerts: s.alerts.filter((a) => !a.acked).length,
    policies: s.policies.filter((p) => p.status === "ACTIVE").length,
  };

  return <TourClient stats={stats} cityName={CITY_NAME} />;
}
