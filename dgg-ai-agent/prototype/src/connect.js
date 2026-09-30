/* 数据接入页 · 副标题「连接 ERP、MES、WMS 与 Excel」落到屏上
 * 四张数据源卡：点一下显示接入状态与读到的表；六个场景各自吃哪些表一目了然；从这里进任一场景。
 * 全部是预置状态（演示样本），不接真实接口；话术口径：读导出表，不改现有系统。
 * 对外：window.DGG.connect = { render(host, api, focusKey) }
 */
(function () {
  'use strict';
  window.DGG = window.DGG || {};
  var SRC = [
    { key: 'erp', name: 'ERP', full: '进销存 · 订单 · 财务', color: '#8B5CF6', tables: ['销售订单表', '生产订单表', '物料与库存表', '科目余额表', '应收应付明细'], feeds: ['m10', 'm6', 'm9', 'm4'] },
    { key: 'mes', name: 'MES', full: '制造执行 · 报工 · 工序', color: '#19B3C9', tables: ['工序报工记录', '产线日历与班次', '设备停机记录', '换型记录'], feeds: ['m8', 'm10', 'm9'] },
    { key: 'wms', name: 'WMS', full: '仓储 · 齐套 · 在途', color: '#1FB98A', tables: ['库存台账', '齐套核对表', '采购在途', '安全库存参数'], feeds: ['m10', 'm6'] },
    { key: 'xls', name: 'Excel', full: '花名册 · 合同 · 询盘', color: '#FF9A4D', tables: ['员工花名册与工资表', '合同台账', '展会线索清单', '客户询盘来函', '月度经营会纪要'], feeds: ['m5', 'm4', 'm9'] }
  ];
  var SCENES = [
    { id: 'm4',  name: 'AI获客',            c: '#F0508A', needs: ['xls', 'erp'] },
    { id: 'm6',  name: 'AI现金流与经营预警', c: '#1FB98A', needs: ['erp', 'wms'] },
    { id: 'm10', name: 'AI工序级排程',       c: '#E5484D', needs: ['erp', 'mes', 'wms'] },
    { id: 'm5',  name: 'AI人岗匹配与用工合规', c: '#C247D6', needs: ['xls'] },
    { id: 'm8',  name: 'AI报工核验',         c: '#19B3C9', needs: ['mes', 'erp'] },
    { id: 'm9',  name: 'AI经营指标分析',     c: '#8BC34A', needs: ['erp', 'mes', 'xls'] }
  ];
  var state = { on: {} };

  function render(host, api, focusKey) {
    var h = api.h;
    var co = api.getCompany() || api.DATA.companies[0].profile;
    var root = h('div', { class: 'cn-page' });
    root.appendChild(h('div', { class: 'cn-head' }, [
      h('div', { class: 'eyebrow' }, ['数据接入 · 不换系统，读您已有的数']),
      h('h1', {}, ['连接 ERP、MES、WMS 与 Excel']),
      h('p', {}, ['演示企业：', h('b', {}, [co.name]), ' · 汽车零部件 · 江苏无锡 · 168 人。点数据源卡片建立接入，右侧六个场景按已接入的数据自动点亮。'])
    ]));
    var grid = h('div', { class: 'cn-grid' });
    var left = h('div', { class: 'cn-src' }), right = h('div', { class: 'cn-scenes' });
    grid.appendChild(left); grid.appendChild(right); root.appendChild(grid);

    function ready(s) { return s.needs.every(function (k) { return state.on[k]; }); }
    function draw() {
      api.clear(left); api.clear(right);
      SRC.forEach(function (s) {
        var on = !!state.on[s.key];
        var card = h('button', { class: 'cn-card' + (on ? ' on' : '') + (focusKey === s.key ? ' focus' : ''), style: '--c:' + s.color,
          onclick: function () { state.on[s.key] = !on; api.touch(); draw(); } }, [
          h('div', { class: 'top' }, [h('span', { class: 'mark' }, [s.name]), h('span', { class: 'st' }, [on ? '已接入' : '点击接入'])]),
          h('div', { class: 'full' }, [s.full]),
          h('ul', { class: 'tables' }, s.tables.map(function (t, i) { return h('li', { style: 'animation-delay:' + (i * 90) + 'ms' }, [t]); })),
          h('div', { class: 'foot' }, [on ? '读取方式：导出表 / 定时同步 · 数据不出企业' : '接入后显示可读取的表'])
        ]);
        left.appendChild(card);
      });
      var n = Object.keys(state.on).filter(function (k) { return state.on[k]; }).length;
      right.appendChild(h('div', { class: 'cn-sum' }, [h('b', {}, [String(n)]), ' / 4 个数据源已接入 · ', h('b', {}, [String(SCENES.filter(ready).length)]), ' / 6 个场景可运行']));
      SCENES.forEach(function (s) {
        var ok = ready(s);
        right.appendChild(h('button', { class: 'cn-scene' + (ok ? ' ok' : ''), style: '--c:' + s.c, onclick: function () { api.go(s.id); } }, [
          h('span', { class: 'dot' }), h('span', { class: 'n' }, [s.name]),
          h('span', { class: 'needs' }, s.needs.map(function (k) { var src = SRC.filter(function (x) { return x.key === k; })[0]; return h('i', { class: state.on[k] ? 'on' : '' }, [src.name]); })),
          h('span', { class: 'go' }, [ok ? '进入 ›' : '待接入'])
        ]));
      });
      right.appendChild(h('button', { class: 'cn-all', onclick: function () { SRC.forEach(function (s) { state.on[s.key] = true; }); draw(); } }, ['一键接入全部数据源']));
    }
    if (focusKey && !state.on[focusKey]) state.on[focusKey] = true;
    draw();
    host.appendChild(root);
  }
  window.DGG.connect = { render: render, SCENES: SCENES, SRC: SRC };
})();
