import React, { useEffect, useRef } from 'react';

interface Star {
  x: number; y: number; r: number;
  base: number; phase: number; twinkleSpeed: number;
  layer: 0 | 1 | 2;
}

const STAR_COLORS = ['#ffffff', '#fff7e0', '#dbeafe', '#fef3c7', '#fbcfe8'];

/**
 * Multi-layer animated star field. Three layers of parallax-drifting
 * stars with twinkle + occasional meteors. Canvas-based for perf.
 */
export const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let stars: Star[] = [];
    let meteors: Array<{
      x: number; y: number; vx: number; vy: number;
      life: number; trail: number; color: string;
    }> = [];
    let width = 0, height = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with area
      const target = Math.round((width * height) / 4800);
      stars = new Array(target).fill(0).map(() => {
        const layer = (Math.random() < 0.6 ? 0 : Math.random() < 0.85 ? 1 : 2) as 0|1|2;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: layer === 2 ? 1.3 + Math.random() * 1.0 : layer === 1 ? 0.8 + Math.random() * 0.7 : 0.4 + Math.random() * 0.5,
          base: 0.18 + Math.random() * 0.62,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.4 + Math.random() * 1.6,
          layer,
        };
      });
    }

    function spawnMeteor() {
      const fromTop = Math.random() < 0.5;
      const x = Math.random() * width;
      const y = fromTop ? -20 : Math.random() * height * 0.4;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.4;
      const speed = 6 + Math.random() * 4;
      meteors.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        trail: 80 + Math.random() * 60,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      });
    }

    let last = performance.now();
    let meteorTimer = 0;

    function frame(now: number) {
      const dt = Math.min(40, now - last) / 1000;
      last = now;

      ctx.clearRect(0, 0, width, height);

      // Stars
      for (const s of stars) {
        s.phase += dt * s.twinkleSpeed;
        const t = (Math.sin(s.phase) * 0.5 + 0.5);
        const alpha = s.base * (0.5 + t * 0.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.layer === 2 ? '#fff7e0' : '#ffffff';
        if (s.layer >= 1) {
          // Add gentle glow for brighter layers
          ctx.shadowColor = s.layer === 2 ? 'rgba(255, 240, 200, 0.9)' : 'rgba(255,255,255,0.6)';
          ctx.shadowBlur = s.layer === 2 ? 10 : 4;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Meteors
      meteorTimer += dt;
      if (meteorTimer > 5.5 + Math.random() * 6 && meteors.length < 3) {
        spawnMeteor();
        meteorTimer = 0;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        m.x += m.vx;
        m.y += m.vy;
        // Tail
        const tx = m.x - m.vx * m.trail * 0.08;
        const ty = m.y - m.vy * m.trail * 0.08;
        const grad = ctx.createLinearGradient(tx, ty, m.x, m.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, m.color);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        // Head
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (m.x > width + 40 || m.y > height + 40 || m.life > 3) {
          meteors.splice(i, 1);
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden
    />
  );
};
