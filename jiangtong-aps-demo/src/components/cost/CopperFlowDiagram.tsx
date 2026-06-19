// §10.1 铜材闭环可视化（差异化亮点） —— 自研 SVG 桑基流图
//   铜杆投入 ─► 拉丝 ─► 漆包 ─► 成品出库
//                │       │
//                ▼       ▼
//          边角料回收 / 损耗 → 含铜废料变卖 → 价值回冲
import { useEffect, useRef, useState } from 'react';
import type { CopperFlowData } from '../../types/cost';
import { fmtMoney } from '../../utils/format';

interface Props { data: CopperFlowData }

export default function CopperFlowDiagram({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [played, setPlayed] = useState(false);
  // 进入视口时触发动画
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setPlayed(true)),
      { threshold: 0.2 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const ce = data.closureError;

  // ============ SVG 布局参数 ============
  const W = 1100;
  const H = 360;
  const mainY = 80;          // 主流（铜流）中线
  const mainH = 36;          // 主流粗细
  const stageW = 200;        // 每阶段块宽
  const gapX = 60;           // 阶段间距

  // 节点 X 坐标
  const node1X = 40;                                                 // 铜杆投入
  const node2X = node1X + stageW + gapX;                             // 拉丝
  const node3X = node2X + stageW + gapX;                             // 漆包
  const node4X = node3X + stageW + gapX;                             // 成品

  // 副流（回收/损耗）汇合节点
  const scrapY = 250;
  const scrapX = (node2X + node3X) / 2 + 90;                         // 略偏右
  const sellX  = node4X + 70;
  const sellY  = scrapY;

  // 渐变 ID
  const gradMain = 'cf-grad-main';
  const gradRecov = 'cf-grad-rec';

  return (
    <div ref={ref} className="card-base p-5">
      <div className="flex items-baseline mb-3">
        <h3 className="text-[14px] font-semibold">铜材闭环可视化</h3>
        <span className="ml-3 text-[11.5px] text-ink-faint">本月铜材流动 · 含废料回收价值回冲</span>
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="block" style={{ width: '100%', minWidth: 900 }}>
          <defs>
            <linearGradient id={gradMain} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="#FF6B35" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FFA37A" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id={gradRecov} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <marker id="cf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#9CA3AF" />
            </marker>
          </defs>

          {/* ============ 主流（铜流） ============ */}
          {/* 投入 → 拉丝 */}
          <FlowSegment x1={node1X + stageW} y1={mainY + mainH/2} x2={node2X} y2={mainY + mainH/2}
            thickness={mainH} gradId={gradMain} played={played} delay={100} />
          {/* 拉丝 → 漆包（变细：扣除损耗+边角料） */}
          <FlowSegment x1={node2X + stageW} y1={mainY + mainH/2} x2={node3X} y2={mainY + mainH/2}
            thickness={mainH - 4} gradId={gradMain} played={played} delay={250} />
          {/* 漆包 → 成品（再细） */}
          <FlowSegment x1={node3X + stageW} y1={mainY + mainH/2} x2={node4X} y2={mainY + mainH/2}
            thickness={mainH - 8} gradId={gradMain} played={played} delay={400} />

          {/* ============ 副流（损耗 / 边角料 向下汇到废料节点） ============ */}
          {/* 拉丝下分 */}
          <SubFlow x1={node2X + stageW/2 + 40} y1={mainY + mainH} x2={scrapX} y2={scrapY}
                   color="#7C3AED" played={played} delay={500} />
          {/* 漆包下分 */}
          <SubFlow x1={node3X + stageW/2 + 40} y1={mainY + mainH} x2={scrapX} y2={scrapY}
                   color="#7C3AED" played={played} delay={650} />

          {/* 废料 → 变卖（橙色） */}
          <SubFlow x1={scrapX + 110} y1={scrapY + 30} x2={sellX} y2={sellY + 30}
                   color="#FF6B35" played={played} delay={800} />
          {/* 变卖 → 价值回冲到成品（绿色，向上回流） */}
          <SubFlow x1={sellX + 80} y1={sellY + 15} x2={node4X + stageW/2} y2={mainY + mainH + 8}
                   color="#10B981" played={played} delay={950} dashed />

          {/* ============ 主节点矩形 ============ */}
          <StageBox x={node1X} y={mainY - 8} w={stageW} h={mainH + 16}
            title="铜杆投入" valueTons={data.copperInput} tone="primary" played={played} delay={0} />
          <StageBox x={node2X} y={mainY - 8} w={stageW} h={mainH + 16}
            title="拉丝" valueTons={data.stages[0].outputTons}
            loss={data.stages[0].loss} scrap={data.stages[0].scrapRecovery}
            tone="mid" played={played} delay={150} />
          <StageBox x={node3X} y={mainY - 8} w={stageW} h={mainH + 16}
            title="漆包" valueTons={data.stages[1].outputTons}
            loss={data.stages[1].loss} scrap={data.stages[1].scrapRecovery}
            tone="mid" played={played} delay={300} />
          <StageBox x={node4X} y={mainY - 8} w={stageW} h={mainH + 16}
            title="成品出库" valueTons={data.finishedOutput} tone="success" played={played} delay={450} />

          {/* 废料节点 */}
          <ScrapBox x={scrapX - 95} y={scrapY} title="边角料 / 损耗" played={played} delay={700}
                    loss={data.stages[0].loss + data.stages[1].loss}
                    scrap={data.stages[0].scrapRecovery + data.stages[1].scrapRecovery} />
          {/* 变卖节点 */}
          <SellBox x={sellX} y={sellY} title="含铜废料变卖" valueText={fmtMoney(data.scrapValue)}
                   played={played} delay={900} />
        </svg>
      </div>

      {/* 闭环误差等式条 */}
      <div className="mt-4 rounded-lg bg-panel2 border border-line p-4">
        <div className="flex items-baseline mb-1.5">
          <span className="text-[12px] font-semibold text-ink-dim">闭环误差</span>
          <span className="ml-2 text-[11px] text-ink-faint">理论 - 实际损耗 - 回收 = 净损耗</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap font-mono text-[13.5px] tabular-nums">
          <Term label="理论"   value={`${ce.theoretical}t`}  color="text-ink" />
          <Op>−</Op>
          <Term label="实际损耗" value={`${Math.abs(ce.actual)}t`}      color="text-warn" />
          <Op>−</Op>
          <Term label="回收"   value={`${Math.abs(ce.recovery)}t`}    color="text-ai" />
          <Op>=</Op>
          <Term label="净损耗" value={`${ce.netLoss}t`}     color="text-danger" big />
          <span className="ml-2 px-2 py-0.5 rounded-md bg-danger/10 text-danger text-[11px] font-semibold">
            净损耗率 {ce.netLossRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============== 子组件 ============== */

function Term({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center px-2">
      <div className="text-[10px] text-ink-faint">{label}</div>
      <div className={`${big ? 'text-[18px] font-bold' : 'text-[14px] font-semibold'} ${color}`}>{value}</div>
    </div>
  );
}
function Op({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-faint text-[16px] font-bold">{children}</span>;
}

interface SegProps {
  x1: number; y1: number; x2: number; y2: number;
  thickness: number;
  gradId: string;
  played: boolean;
  delay: number;
}
function FlowSegment({ x1, y1, x2, y2, thickness, gradId, played, delay }: SegProps) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return (
    <g style={{ transition: 'opacity 0.4s', opacity: played ? 1 : 0, transitionDelay: `${delay}ms` }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={`url(#${gradId})`}
        strokeWidth={thickness}
        strokeLinecap="butt"
        strokeDasharray={played ? undefined : len}
        strokeDashoffset={played ? 0 : len}
        style={{ transition: `stroke-dashoffset 1.2s ease ${delay}ms` }}
      />
      {/* 表面高光 */}
      <line x1={x1} y1={y1 - thickness/2 + 3} x2={x2} y2={y2 - thickness/2 + 3}
        stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
    </g>
  );
}
function SubFlow({ x1, y1, x2, y2, color, played, delay, dashed }: { x1: number; y1: number; x2: number; y2: number; color: string; played: boolean; delay: number; dashed?: boolean }) {
  // 用 cubic bezier 给副流一点弧度
  const cx1 = x1, cy1 = (y1 + y2) / 2;
  const cx2 = x2, cy2 = (y1 + y2) / 2;
  const d = `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
  // 估算长度
  const len = 220;
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
      strokeDasharray={dashed ? '6 5' : (played ? undefined : len)}
      strokeDashoffset={played ? 0 : (dashed ? undefined : len)}
      opacity={dashed ? 0.85 : 0.9}
      style={{ transition: `stroke-dashoffset 1s ease ${delay}ms, opacity 0.3s ease ${delay}ms` }}
      markerEnd="url(#cf-arrow)"
    />
  );
}

function StageBox({ x, y, w, h, title, valueTons, loss, scrap, tone, played, delay }: {
  x: number; y: number; w: number; h: number;
  title: string; valueTons: number;
  loss?: number; scrap?: number;
  tone: 'primary' | 'mid' | 'success';
  played: boolean; delay: number;
}) {
  const bgs = {
    primary: { fill: '#FFF1E6', stroke: '#FF6B35', text: '#9A3D14', sub: '#B8550F' },
    mid:     { fill: '#FFFFFF', stroke: '#D1D5DB', text: '#1F2937', sub: '#5B6573' },
    success: { fill: '#E7F8F0', stroke: '#10B981', text: '#0B5C42', sub: '#0F7C5C' },
  } as const;
  const c = bgs[tone];
  return (
    <g style={{ opacity: played ? 1 : 0, transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms` }}>
      <rect x={x} y={y} width={w} height={h} rx={8} ry={8}
        fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />
      <text x={x + 14} y={y + 22} fontSize="13" fontWeight="700" fill={c.text}>{title}</text>
      <text x={x + w - 14} y={y + 22} fontSize="18" fontWeight="800" fill={c.text}
        textAnchor="end" style={{ fontFamily: 'monospace' }}>
        {played ? <Counter from={0} to={valueTons} /> : 0} t
      </text>
      {(loss != null || scrap != null) && (
        <>
          <text x={x + 14} y={y + 44} fontSize="11" fill={c.sub}>
            损耗 <tspan fontWeight="700" fill="#E0972A">{loss}t</tspan>
          </text>
          <text x={x + w - 14} y={y + 44} fontSize="11" fill={c.sub} textAnchor="end">
            边角料回收 <tspan fontWeight="700" fill="#7C3AED">{scrap}t</tspan>
          </text>
        </>
      )}
    </g>
  );
}
function ScrapBox({ x, y, title, loss, scrap, played, delay }: { x: number; y: number; title: string; loss: number; scrap: number; played: boolean; delay: number }) {
  return (
    <g style={{ opacity: played ? 1 : 0, transition: `opacity 0.5s ease ${delay}ms` }}>
      <rect x={x} y={y} width={220} height={66} rx={8}
        fill="#F5F0FF" stroke="#7C3AED" strokeWidth="1.5" />
      <text x={x + 14} y={y + 22} fontSize="12.5" fontWeight="700" fill="#5B21B6">{title}</text>
      <text x={x + 14} y={y + 42} fontSize="11.5" fill="#5B21B6">
        损耗 <tspan fontWeight="800" fill="#E0972A">{loss}t</tspan>
      </text>
      <text x={x + 14} y={y + 58} fontSize="11.5" fill="#5B21B6">
        边角料回收 <tspan fontWeight="800" fill="#7C3AED">{scrap}t</tspan>
      </text>
    </g>
  );
}
function SellBox({ x, y, title, valueText, played, delay }: { x: number; y: number; title: string; valueText: string; played: boolean; delay: number }) {
  return (
    <g style={{ opacity: played ? 1 : 0, transition: `opacity 0.5s ease ${delay}ms` }}>
      <rect x={x} y={y} width={200} height={66} rx={8}
        fill="#FFF1E6" stroke="#FF6B35" strokeWidth="1.5" />
      <text x={x + 14} y={y + 22} fontSize="12.5" fontWeight="700" fill="#9A3D14">{title}</text>
      <text x={x + 14} y={y + 50} fontSize="18" fontWeight="800" fill="#FF6B35">{valueText}</text>
    </g>
  );
}

// 数字滚动（用 SVG 不支持 React 子组件挂载，所以用 useEffect 写到 ref）
function Counter({ from, to }: { from: number; to: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    let start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return <>{v}</>;
}
