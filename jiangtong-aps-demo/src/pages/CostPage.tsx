import PageHeader from '../components/layout/PageHeader';

// Sprint 0 占位（Sprint 3 实现 §10：铜材闭环 + 损耗诊断 + 成本分析助手）
export default function CostPage() {
  return (
    <div className="p-5">
      <PageHeader
        title="成本核算"
        subtitle="本月 · 全部车间 · Sprint 3 将实现：铜材闭环可视化 + 工单成本台账 + 损耗诊断 + 成本分析助手"
      />
      <div className="card-base p-10 text-center">
        <p className="text-ink-dim text-[13px]">
          Sprint 0 框架就绪。<br />
          Sprint 3 落地：铜杆 → 拉丝 → 漆包 → 成品 闭环流图（含废料回收）<br />
          + ✨ 损耗异常诊断（根因分析）+ 💬 成本分析助手（自然语言问数）。
        </p>
      </div>
    </div>
  );
}
