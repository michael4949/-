import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}
export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-end gap-4 flex-wrap mb-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-wide">{title}</h1>
        {subtitle && <div className="text-[12.5px] text-ink-faint mt-0.5">{subtitle}</div>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
