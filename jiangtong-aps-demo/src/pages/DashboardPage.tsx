import PageHeader from '../components/layout/PageHeader';

// Sprint 0 占位（Sprint 1 完整实现 §8）
export default function DashboardPage() {
  return (
    <div className="p-5">
      <PageHeader
        title="工作台"
        subtitle="早上好，张工 · 2026-07-15 周二 · Sprint 1 将完整实现首页（AI Insight Card + KPI + 待办 + 产线状态）"
      />
      <div className="card-base p-10 text-center">
        <p className="text-ink-dim text-[13px]">
          Sprint 0 已搭建好框架。<br />
          Sprint 1 将在此页落地：今日 AI 提示三条 · 8 项核心 KPI · 待办列表 · 产线实时状态。
        </p>
      </div>
    </div>
  );
}
