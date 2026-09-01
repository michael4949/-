const LAYOUT = `
<div id="app">
  <div class="top">
    <div class="brand">
      <img src="__LOGO__" alt="中国南方电网 深圳供电局有限公司">
      <div class="pill">小瓦特·练　AI智能陪练底座</div>
      <button class="homebtn" id="tohome">工作台</button>
    </div>
    <div class="task">
      <div class="t1">110kV培训三线1163线路由运行转检修</div>
      <div class="t2" id="planline">110kV仿真站 · 变电运行 · 倒闸操作陪练 · 操作人视角</div>
    </div>
    <div class="spacer"></div>
    <div class="states" id="states"></div>
    <div class="kpis">
      <div class="kpi"><b id="ktime">00:00</b><span>用时</span></div>
      <div class="kpi"><b id="kdone">0/29</b><span>操作项</span></div>
      <div class="kpi good"><b id="kvio">0</b><span>违规</span></div>
      <div class="kpi"><b id="kstop">0</b><span>中止上报</span></div>
    </div>
  </div>

  <div class="main2">
    <!-- 对练区 -->
    <div class="arena">
      <div id="scene"></div>
      <div class="arena-top">
      <div class="arena-l">
        <div id="dh"></div>
        <video id="dhvid" playsinline></video>
        <div class="stage-tag">
          <div class="loc" id="loctag">调度电话旁</div>
          <div class="live"><i></i><span id="dhmode">内置渲染</span></div>
          <button class="cfgbtn" id="dhcfg" title="数字人设置">⚙</button>
        </div>
        <div class="rolecard">
          <b id="rcname">陈志远</b>
          <span id="rcrole">AI数字人陪练教练 · 监护人</span>
        </div>
        <div class="sync" id="sync">
          <span class="ch" id="sy_c">—</span>
          <b id="sy_v">口型 静止</b>
          <span class="bar"><i id="sy_b"></i></span>
          <span class="g" id="sy_g">站姿待命</span>
        </div>
      </div>
      <div class="arena-r">
        <div class="chathead">现场对练<span id="chatmode">教学模式</span></div>
        <div class="cb" id="chat"></div>
      </div>
      <div class="sub" style="display:none"><div id="subwho"></div><div id="subtxt"></div></div>
      </div>

      <!-- 道具层：作业面板 -->
      <div class="sheet" id="sheet">
        <div class="sheethead">
          <span class="sheettitle" id="sheettitle">作业面板</span>
          <div class="locbar" id="locbar"></div>
          <button class="sheetfold" id="sheetfold">收起</button>
        </div>
        <div class="panelwrap" id="panelwrap"></div>
      </div>
      <button class="sheetpeek" id="sheetpeek">展开作业面板</button>
    </div>

    <!-- 右栏 -->
    <div class="side">
      <div class="taskbar" id="taskbar"></div>
      <div id="kpbox"></div>
      <div class="ticket">
        <div class="thead">
          <div class="ttl">110kV仿真站 现场电气操作票</div>
          <div class="meta">
            <div>票号 <b>2600137</b></div><div>类型 <b>根据调度令进行的操作</b></div>
            <div>操作人 <b>任玲玲</b></div><div>监护人 <b>陈志远</b></div>
          </div>
        </div>
        <div class="trows" id="trows"></div>
      </div>
    </div>
  </div>

  <div class="act" id="actwrap">
    <div id="actbar"></div>
    <div class="beats" id="beats"></div>
  </div>
</div>

<div class="demo" id="demo">
  <div class="bd">
    <div class="t">讲师演示台</div>
    <button id="dm_auto">自动执行当前节拍</button>
    <button id="dm_skip">跳过当前准备阶段</button>
    <button id="dm_red">触发红线：未验电合地刀</button>
    <button id="dm_abn">注入异常：刀闸位置指示不一致</button>
  </div>
  <button class="tg" id="demotg">讲师演示台</button>
</div>
`;
