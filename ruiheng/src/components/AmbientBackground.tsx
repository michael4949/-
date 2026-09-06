import { useEffect, useRef } from 'react';

/**
 * 全站动效背景：金融元素（K 线、网格、¥ 与百分号、上升箭头、金币）+ AI 元素（神经网络节点与脉冲、数据流）。
 * 低透明度、慢速、固定在内容之下；尊重 prefers-reduced-motion。
 */
export default function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, raf = 0, t = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { W = canvas.width = Math.floor(innerWidth * DPR); H = canvas.height = Math.floor(innerHeight * DPR); canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; };
    resize(); addEventListener('resize', resize);

    // 神经网络节点
    const N = 46;
    const nodes = Array.from({ length: N }, (_, i) => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.00025, vy: (Math.random() - 0.5) * 0.00025, r: 1.2 + Math.random() * 1.8, hue: i % 3 }));
    // 脉冲（沿边移动的光点）
    const pulses: { a: number; b: number; p: number; s: number }[] = [];
    // 漂浮的金融符号
    const glyphs = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), s: 0.00015 + Math.random() * 0.00025, ch: ['¥', '%', '▲', '$', '€', '↑', '¥', '%'][Math.floor(Math.random() * 8)], o: Math.random() * Math.PI * 2, size: 12 + Math.random() * 16 }));
    // 金币
    const coins = Array.from({ length: 10 }, () => ({ x: Math.random(), y: Math.random(), s: 0.0002 + Math.random() * 0.0003, r: 6 + Math.random() * 8, o: Math.random() * Math.PI * 2 }));
    // K 线
    const candles = Array.from({ length: 48 }, (_, i) => { const base = 0.5 + Math.sin(i / 5) * 0.12 + (Math.random() - 0.5) * 0.08; const open = base, close = base + (Math.random() - 0.45) * 0.08; return { open, close, hi: Math.max(open, close) + Math.random() * 0.04, lo: Math.min(open, close) - Math.random() * 0.04 }; });
    const orbs = [
      { x: 0.12, y: 0.18, r: 0.34, c: [195, 39, 43], sp: 0.00011, ph: 0 },
      { x: 0.82, y: 0.22, r: 0.3, c: [201, 162, 77], sp: 0.00009, ph: 2 },
      { x: 0.62, y: 0.86, r: 0.36, c: [31, 138, 90], sp: 0.00012, ph: 4 },
      { x: 0.3, y: 0.78, r: 0.26, c: [155, 93, 229], sp: 0.0001, ph: 1 },
    ];
    const col = (h: number, a: number) => (h === 0 ? `rgba(195,39,43,${a})` : h === 1 ? `rgba(201,162,77,${a})` : `rgba(31,138,90,${a})`);

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, W, H);
      // 1. 幻彩光斑
      for (const o of orbs) {
        const ox = (o.x + Math.sin(t * o.sp * 10 + o.ph) * 0.05) * W, oy = (o.y + Math.cos(t * o.sp * 8 + o.ph) * 0.05) * H;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.r * Math.max(W, H));
        g.addColorStop(0, `rgba(${o.c[0]},${o.c[1]},${o.c[2]},0.13)`); g.addColorStop(1, `rgba(${o.c[0]},${o.c[1]},${o.c[2]},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      // 2. 金融网格
      ctx.strokeStyle = 'rgba(120,100,60,0.055)'; ctx.lineWidth = 1 * DPR;
      const step = 96 * DPR; const off = (t * 0.15 * DPR) % step;
      for (let x = -off; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = -off; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // 3. K 线（底部缓慢滚动）
      const cw = W / 44; const shift = (t * 0.25 * DPR) % cw;
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i]; const x = i * cw - shift; if (x < -cw || x > W) continue;
        const y = (v: number) => H * (0.62 + (0.5 - v) * 0.55);
        const up = c.close >= c.open; ctx.strokeStyle = up ? 'rgba(31,138,90,0.16)' : 'rgba(195,39,43,0.14)'; ctx.fillStyle = up ? 'rgba(61,187,134,0.10)' : 'rgba(224,70,63,0.09)';
        ctx.lineWidth = 1.2 * DPR; ctx.beginPath(); ctx.moveTo(x + cw * 0.5, y(c.hi)); ctx.lineTo(x + cw * 0.5, y(c.lo)); ctx.stroke();
        const top = y(Math.max(c.open, c.close)), bot = y(Math.min(c.open, c.close)); ctx.fillRect(x + cw * 0.22, top, cw * 0.56, Math.max(2, bot - top));
      }
      // 4. 神经网络
      for (const n of nodes) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > 1) n.vx *= -1; if (n.y < 0 || n.y > 1) n.vy *= -1; }
      const maxD = 0.16;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j]; const dx = (a.x - b.x) * (W / H), dy = a.y - b.y; const d = Math.hypot(dx, dy);
        if (d < maxD) {
          const al = (1 - d / maxD) * 0.22; ctx.strokeStyle = `rgba(201,162,77,${al})`; ctx.lineWidth = 0.8 * DPR;
          ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke();
          if (pulses.length < 14 && Math.random() < 0.0009) pulses.push({ a: i, b: j, p: 0, s: 0.004 + Math.random() * 0.006 });
        }
      }
      for (const n of nodes) {
        const g = ctx.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r * 4 * DPR);
        g.addColorStop(0, col(n.hue, 0.55)); g.addColorStop(1, col(n.hue, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x * W, n.y * H, n.r * 4 * DPR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col(n.hue, 0.7); ctx.beginPath(); ctx.arc(n.x * W, n.y * H, n.r * DPR, 0, Math.PI * 2); ctx.fill();
      }
      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k]; p.p += p.s; if (p.p >= 1) { pulses.splice(k, 1); continue; }
        const a = nodes[p.a], b = nodes[p.b]; const x = (a.x + (b.x - a.x) * p.p) * W, y = (a.y + (b.y - a.y) * p.p) * H;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7 * DPR); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(239,212,138,0.8)'); g.addColorStop(1, 'rgba(195,39,43,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7 * DPR, 0, Math.PI * 2); ctx.fill();
      }
      // 5. 漂浮符号与金币
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const g of glyphs) {
        g.y -= g.s; if (g.y < -0.05) { g.y = 1.05; g.x = Math.random(); }
        const a = 0.10 + 0.08 * Math.sin(t * 0.02 + g.o); ctx.fillStyle = `rgba(156,122,46,${a})`; ctx.font = `700 ${g.size * DPR}px system-ui, sans-serif`;
        ctx.fillText(g.ch, (g.x + Math.sin(t * 0.01 + g.o) * 0.01) * W, g.y * H);
      }
      for (const c of coins) {
        c.y -= c.s; if (c.y < -0.05) { c.y = 1.05; c.x = Math.random(); }
        const x = (c.x + Math.sin(t * 0.008 + c.o) * 0.012) * W, y = c.y * H, r = c.r * DPR;
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, 'rgba(247,226,165,0.28)'); g.addColorStop(0.7, 'rgba(201,162,77,0.20)'); g.addColorStop(1, 'rgba(156,122,46,0.06)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(156,122,46,0.18)'; ctx.lineWidth = 1 * DPR; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(156,122,46,0.30)'; ctx.font = `800 ${r * 1.1}px system-ui, sans-serif`; ctx.fillText('¥', x, y + r * 0.05);
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="ambient" aria-hidden />;
}
