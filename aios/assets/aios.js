/* ============================================================
   ZenFlux AIOS · 页面交互
   导航 / 滚动浮现 / 数字滚动 / 神经网络粒子 / 控制台打字 / Tabs
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 导航：滚动态 + 移动端菜单 ---------- */
  var nav = document.getElementById("nav");
  var navLinks = document.getElementById("navLinks");
  var burger = document.getElementById("navBurger");

  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  burger.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      burger.classList.remove("open");
    }
  });

  /* ---------- 滚动浮现 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          revealObs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 数字滚动 ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.dataset.target || "0");
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    var dur = 1400;
    var t0 = null;
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = document.querySelectorAll(".counter");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var counterObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          animateCounter(en.target);
          counterObs.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counterObs.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = parseFloat(el.dataset.target || "0")
        .toFixed(parseInt(el.dataset.decimals || "0", 10));
    });
  }

  /* ---------- Hero 神经网络粒子 ---------- */
  var canvas = document.getElementById("neuralCanvas");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], rafId = null, running = false;
    var LINK_DIST = 130;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(Math.round((W * H) / 16000), 80);
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: 1 + Math.random() * 1.6
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = "rgba(90, 91, 240, " + (0.14 * (1 - d / LINK_DIST)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = "rgba(90, 91, 240, 0.35)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    resize();
    window.addEventListener("resize", function () { resize(); }, { passive: true });

    // 仅在 Hero 可见时渲染，节省 CPU
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(canvas);
    } else {
      start();
    }
  }

  /* ---------- 控制台：步骤逐条出现 + 打字回复（循环） ---------- */
  var stepsEl = document.getElementById("agentSteps");
  var typeEl = document.getElementById("typeTarget");
  if (stepsEl && typeEl) {
    var steps = Array.prototype.slice.call(stepsEl.querySelectorAll(".step"));
    var REPLY = "已完成 ✅ 华东区 Q1 销售额 ¥2.4 亿，同比增长 23.6%。周报与 3 张图表已同步给 12 位团队成员。";

    if (reduceMotion) {
      steps.forEach(function (s) { s.classList.add("show"); });
      typeEl.textContent = REPLY;
    } else {
      var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      (async function loop() {
        for (;;) {
          steps.forEach(function (s) { s.classList.remove("show"); });
          typeEl.textContent = "";
          await sleep(700);
          for (var i = 0; i < steps.length; i++) {
            steps[i].classList.add("show");
            await sleep(620);
          }
          await sleep(350);
          for (var c = 0; c < REPLY.length; c++) {
            typeEl.textContent += REPLY[c];
            await sleep(36);
          }
          await sleep(4200);
        }
      })();
    }
  }

  /* ---------- 场景 Tabs ---------- */
  var tabsBox = document.getElementById("scnTabs");
  var panesBox = document.getElementById("scnPanes");
  if (tabsBox && panesBox) {
    var tabs = Array.prototype.slice.call(tabsBox.querySelectorAll(".tab"));
    var panes = Array.prototype.slice.call(panesBox.querySelectorAll(".tab-pane"));
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var idx = parseInt(tab.dataset.tab, 10);
        tabs.forEach(function (t, i) { t.classList.toggle("active", i === idx); });
        panes.forEach(function (p, i) { p.classList.toggle("active", i === idx); });
      });
    });
  }
})();
