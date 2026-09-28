/* 粒子网络背景 */
(function () {
  const c = document.getElementById('fx'); if (!c) return; const x = c.getContext('2d'); c.width = 1440; c.height = 810;
  const light = document.body.classList.contains('light');
  const N = Array.from({ length: 70 }, () => ({ x: Math.random() * 1440, y: Math.random() * 810, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }));
  (function tick() {
    x.clearRect(0, 0, 1440, 810);
    N.forEach(p => { p.x = (p.x + p.vx + 1440) % 1440; p.y = (p.y + p.vy + 810) % 810; x.beginPath(); x.arc(p.x, p.y, 1.8, 0, 7); x.fillStyle = light ? 'rgba(31,95,191,.35)' : 'rgba(150,220,255,.7)'; x.fill(); });
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { const d = Math.hypot(N[i].x - N[j].x, N[i].y - N[j].y); if (d < 130) { x.beginPath(); x.moveTo(N[i].x, N[i].y); x.lineTo(N[j].x, N[j].y); x.strokeStyle = (light ? 'rgba(31,95,191,' : 'rgba(150,220,255,') + (.28 * (1 - d / 130)).toFixed(3) + ')'; x.stroke(); } }
    requestAnimationFrame(tick);
  })();
})();
/* 逐字打出 */
function typeText(el, text, cps) { el.textContent = ''; el.style.opacity = 1; let i = 0; const t = setInterval(() => { i++; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(t); }, 1000 / (cps || 16)); }
