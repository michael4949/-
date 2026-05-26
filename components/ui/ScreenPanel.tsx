import { cn } from "@/lib/utils";

interface ScreenPanelProps {
  title?: string;
  extra?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  bodyClass?: string;
  corners?: boolean;
}

export function ScreenPanel({
  title,
  extra,
  className,
  children,
  bodyClass,
  corners = true,
}: ScreenPanelProps) {
  return (
    <div className={cn("screen-panel flex flex-col", className)}>
      {corners && (
        <>
          <i className="corner-tl" />
          <i className="corner-tr" />
          <i className="corner-bl" />
          <i className="corner-br" />
        </>
      )}
      {title && (
        <div className="screen-title flex justify-between">
          <span>{title}</span>
          {extra && <span className="text-xs text-slate-400 font-normal tracking-normal">{extra}</span>}
        </div>
      )}
      <div className={cn("flex-1 p-3 min-h-0 relative", bodyClass)}>{children}</div>
    </div>
  );
}
