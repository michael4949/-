/* 首页 · 工博会定稿展板（2000×1136）
 * 图原样铺满，上面只盖透明热区与不遮内容的动效：四条光带流动、AI 核心脉冲、环境柔光、标题扫光、轮巡光圈。
 * 热区坐标按原图像素折成百分比，图等比缩放时跟着走。
 * 对外：window.DGG.home = { render(host, api) }
 */
(function () {
  'use strict';
  window.DGG = window.DGG || {};
  var W = 2000, H = 1136;
  function pct(v, t) { return (v / t * 100).toFixed(3) + '%'; }
  function box(r) { return 'left:' + pct(r[0], W) + ';top:' + pct(r[1], H) + ';width:' + pct(r[2], W) + ';height:' + pct(r[3], H); }

  /* 九张卡：方法论三张 + 场景六张（顺序即轮巡顺序）；c 为各自的光圈色（九色互不相同） */
  var HOT = [
    { id: 'm4',  r: [36, 264, 486, 108],   c: '#FF6A3D', label: 'AI全域获客' },
    { id: 'm2',  r: [546, 264, 456, 108],  c: '#8B5CF6', label: '场景优先级规划' },
    { id: 'm3',  r: [1020, 264, 422, 108], c: '#F2B233', label: '投入产出测算' },
    { id: 'm4',  r: [1452, 185, 510, 116], c: '#F0508A', label: 'AI获客' },
    { id: 'm6',  r: [1452, 315, 510, 116], c: '#1FB98A', label: 'AI现金流与经营预警' },
    { id: 'm10', r: [1452, 445, 510, 116], c: '#E5484D', label: 'AI工序级排程' },
    { id: 'm5',  r: [1452, 575, 510, 116], c: '#C247D6', label: 'AI人岗匹配与用工合规' },
    { id: 'm8',  r: [1452, 705, 510, 116], c: '#19B3C9', label: 'AI报工核验' },
    { id: 'm9',  r: [1452, 835, 510, 120], c: '#8BC34A', label: 'AI经营指标分析' }
  ];
  /* 四个数据源节点 → 数据接入页 */
  var SOURCES = [
    { key: 'erp', r: [270, 385, 160, 150] }, { key: 'mes', r: [1100, 395, 160, 150] },
    { key: 'wms', r: [270, 760, 160, 150] }, { key: 'xls', r: [960, 760, 160, 150] }
  ];
  var INDUSTRY_HOT = [1730, 22, 240, 64];

  var timer = null;
  function render(host, api) {
    var h = api.h;
    if (timer) { clearInterval(timer); timer = null; }
    var stage = h('div', { class: 'grid board' });
    var bx = h('div', { class: 'boardbox' });
    bx.appendChild(h('img', { class: 'bg', src: api.CFG.homeBoard, alt: '让AI成为工厂的经营合伙人', draggable: 'false' }));
    bx.appendChild(h('div', { class: 'glow a' })); bx.appendChild(h('div', { class: 'glow b' })); bx.appendChild(h('div', { class: 'sweep' }));
    bx.appendChild(h('div', { class: 'ribbons', html:
      '<svg viewBox="0 0 2000 1136" preserveAspectRatio="none">' +
      '<defs><path id="hb-erp" d="M335 455 C 480 520, 600 590, 740 635"/><path id="hb-mes" d="M1170 460 C 1030 520, 890 590, 740 635"/>' +
      '<path id="hb-wms" d="M335 825 C 480 770, 600 700, 740 635"/><path id="hb-xls" d="M1035 825 C 930 770, 840 700, 740 635"/></defs>' +
      ['erp', 'mes', 'wms'].map(function (k) { return '<g stroke="#B79CFF"><use href="#hb-' + k + '" class="rb glowline"/><use href="#hb-' + k + '" class="rb"/></g>'; }).join('') +
      '<g stroke="#FF9A4D"><use href="#hb-xls" class="rb glowline"/><use href="#hb-xls" class="rb"/></g>' +
      '<circle r="9" fill="#fff" class="dot" style="color:#B79CFF"><animateMotion dur="2.6s" repeatCount="indefinite"><mpath href="#hb-erp"/></animateMotion></circle>' +
      '<circle r="9" fill="#fff" class="dot" style="color:#B79CFF"><animateMotion dur="2.9s" begin="0.7s" repeatCount="indefinite"><mpath href="#hb-mes"/></animateMotion></circle>' +
      '<circle r="9" fill="#fff" class="dot" style="color:#B79CFF"><animateMotion dur="2.7s" begin="1.3s" repeatCount="indefinite"><mpath href="#hb-wms"/></animateMotion></circle>' +
      '<circle r="9" fill="#FFE6CC" class="dot" style="color:#FF9A4D"><animateMotion dur="2.4s" begin="0.4s" repeatCount="indefinite"><mpath href="#hb-xls"/></animateMotion></circle></svg>' }));
    bx.appendChild(h('div', { class: 'core', html: '<i></i><i></i><i></i>' }));

    var hots = [];
    HOT.forEach(function (x) {
      var b = h('button', { class: 'hot', style: '--c:' + x.c + ';' + box(x.r), 'aria-label': x.label, title: x.label,
        onclick: function () { api.go(x.id); } });
      bx.appendChild(b); hots.push(b);
    });
    SOURCES.forEach(function (s) {
      bx.appendChild(h('button', { class: 'hot src', style: '--c:#B79CFF;' + box(s.r), 'aria-label': '数据接入', title: '数据接入',
        onclick: function () { api.go('connect', s.key); } }));
    });
    /* 行业：真下拉盖在图上那只选择框的位置，只列制造业 8 个细分 */
    var sel = h('select', { class: 'hot ind', style: box(INDUSTRY_HOT), 'aria-label': '行业',
      onchange: function (e) { api.setIndustry(e.target.value); } });
    api.mfgIndustries().forEach(function (i) { sel.appendChild(h('option', { value: i.slug }, [i.name])); });
    sel.value = api.industrySlug();
    bx.appendChild(sel);

    stage.appendChild(bx); host.appendChild(stage);

    /* 待机轮巡：每 2.8 秒点亮一张卡；鼠标进入即停 */
    var reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
    var idx = -1, paused = false;
    function next() { if (paused || reduce) return; hots.forEach(function (c) { c.classList.remove('lit'); }); idx = (idx + 1) % hots.length; hots[idx].classList.add('lit'); }
    bx.addEventListener('mouseenter', function () { paused = true; hots.forEach(function (c) { c.classList.remove('lit'); }); });
    bx.addEventListener('mouseleave', function () { paused = false; });
    timer = setInterval(function () { if (!document.contains(bx)) { clearInterval(timer); timer = null; return; } next(); }, 2800);
    setTimeout(next, 1200);
  }
  window.DGG.home = { render: render, HOT: HOT };
})();
