import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
}

// §4.2 骨架页统一样式
export default function PlaceholderPage({ icon: Icon, title }: Props) {
  const nav = useNavigate();
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="card-base p-10 max-w-xl w-full text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-line/40 flex items-center justify-center text-ink-dim">
          <Icon size={32} />
        </div>
        <h2 className="text-[18px] font-semibold mb-2">{title}</h2>
        <p className="text-[13px] text-ink-dim leading-7">
          本模块为产品完整规划范围。<br />
          <span className="text-ink-faint">Demo 阶段重点展示：</span>
        </p>
        <ul className="text-[13px] text-ink mt-2 space-y-1 inline-block text-left">
          <li>· 工作台首页</li>
          <li>· 智能排产</li>
          <li>· 成本核算与铜材闭环</li>
        </ul>
        <div className="mt-7">
          <button onClick={() => nav('/dashboard')} className="btn btn-primary">
            回到工作台
          </button>
        </div>
      </div>
    </div>
  );
}
