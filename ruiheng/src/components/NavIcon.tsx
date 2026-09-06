import * as Icons from 'lucide-react';
import type { Tone } from '../data/products';

/** 侧栏图标徽章：幻彩渐变底 + 玻璃高光 + 悬停流光 + 激活呼吸光环 */
export default function NavIcon({ name, tone = 'gold', active = false, size = 15 }: { name: string; tone?: Tone | 'iris'; active?: boolean; size?: number }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>)[name] ?? Icons.Circle;
  return (
    <span className={`navicon ${tone}${active ? ' on' : ''}`}>
      <span className="ring" />
      <span className="gloss" />
      <span className="shine" />
      <span className="ic"><C size={size} strokeWidth={2.2} /></span>
    </span>
  );
}
