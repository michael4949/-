import PageHeader from '../components/layout/PageHeader';

// Sprint 0 占位（Sprint 1 实现甘特/待排池/详情；Sprint 2 落地 3 个排产 AI）
export default function SchedulePage() {
  return (
    <div className="p-5">
      <PageHeader
        title="智能排产"
        subtitle="漆包车间 · 周视图 · Sprint 1/2 将实现：自研甘特图 + 待排池 + 算法面板 + 紧急插单/解释器/异常识别"
      />
      <div className="card-base p-10 text-center">
        <p className="text-ink-dim text-[13px]">
          Sprint 0 框架就绪。<br />
          Sprint 1 落地：div-based 甘特图、142 张待排池、右侧详情面板、算法权重面板。<br />
          Sprint 2 落地：💬 紧急插单助手 / ✨ 排产方案解释器 / 🤖 异常排产识别。
        </p>
      </div>
    </div>
  );
}
