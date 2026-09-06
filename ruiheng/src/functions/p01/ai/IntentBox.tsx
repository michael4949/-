import { Sparkles, X, Brain } from 'lucide-react';
import type { Constraint, CGroup } from './types';

/** "我的目标 / 约束"自由文本 + "AI 理解为"结构化约束（可关闭 / 移除）。 */
export default function IntentBox({ value, onChange, constraints, onToggle, onRemove, examples, placeholder, title = '我的目标 / 约束' }: {
  value: string; onChange: (v: string) => void; constraints: Constraint[]; onToggle: (key: string) => void; onRemove: (key: string) => void;
  examples: string[]; placeholder?: string; title?: string;
}) {
  const groups: CGroup[] = ['目标', '约束', '关键人', '资源', '时间', '范围'];
  const active = constraints.filter((c) => c.on).length;
  return (
    <div className="ai-intent">
      <div className="ai-sec"><Brain size={12} />{title}<span className="ai-muted" style={{ letterSpacing: 0, fontWeight: 600 }}>用一句话说明想做什么、不做什么、有什么限制；AI 按关键词解析并实时改写方案</span></div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? '例：半年内切入结算，不做授信；董事长是技术出身；预算有限，优先低成本触达'} />
      <div className="ai-ex">
        <span className="ai-muted">常见写法：</span>
        {examples.map((x) => <button key={x} onClick={() => onChange(value ? `${value.replace(/[；;]?\s*$/, '')}；${x}` : x)}>{x}</button>)}
        {value && <button onClick={() => onChange('')}><X size={10} /> 清空</button>}
      </div>
      {(value.trim() || constraints.length > 0) && (
        <div className="ai-under fade-in">
          <div className="h"><Sparkles size={13} color="var(--red)" />AI 理解为：<span className="ai-muted">{constraints.length ? `${active} 项生效 / ${constraints.length} 项识别 · 点击可关闭，× 移除` : '暂未识别出结构化约束，将作为背景说明写入方案'}</span></div>
          {constraints.length > 0 && (
            <div className="ai-cs">
              {groups.filter((g) => constraints.some((c) => c.group === g)).map((g) => constraints.filter((c) => c.group === g).map((c) => (
                <span key={c.key} className={`ai-c${c.on ? '' : ' off'}`} title={`来自：「${c.from}」`} onClick={() => onToggle(c.key)}>
                  <span className="g">{g}</span>{c.label}
                  <button className="x" onClick={(e) => { e.stopPropagation(); onRemove(c.key); }} title="移除"><X size={11} /></button>
                </span>
              )))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
