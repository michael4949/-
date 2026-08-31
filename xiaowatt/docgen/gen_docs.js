/* 两份参赛项目需求文档 · 南网配色 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, AlignmentType, HeadingLevel, ImageRun, Header, Footer,
  PageNumber, LevelFormat, TabStopType, VerticalAlign
} = require('docx');

const NAVY = '00367A', BLUE = '1E63B8', TXT = '1A2A3A', GREY = '5A6B7E',
  BORDER = 'C9D6E8', ZEBRA = 'F4F8FC', LIGHT = 'EAF1F9', GOLD = 'B7791F';
const FONT = { ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: '微软雅黑' };
const LOGO = fs.readFileSync('/home/claude/logo.png');
const CONTENT_W = 9750; // DXA 可用宽度

const run = (t, o = {}) => new TextRun(Object.assign({ text: t, font: FONT, size: 21, color: TXT }, o));

const P = (children, o = {}) => new Paragraph(Object.assign({ children, spacing: Object.assign({ line: 312, after: 120 }, o.spacing || {}) }, o, { spacing: undefined, ...{} , spacing: Object.assign({ line: 312, after: 120 }, o.spacing || {}) }));

function body(t, o = {}) {
  return new Paragraph({
    children: [run(t, o.run || {})],
    spacing: { line: 320, after: 130 },
    alignment: o.align, indent: o.indent
  });
}
function h1(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 340, after: 180, line: 300 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } },
    children: [new TextRun({ text: t, font: FONT, size: 31, bold: true, color: NAVY })]
  });
}
function h2(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 130, line: 300 },
    children: [new TextRun({ text: t, font: FONT, size: 25, bold: true, color: NAVY })]
  });
}
function bullet(t, bold0) {
  const parts = bold0 ? t.split('：') : null;
  const children = bold0 && parts.length > 1
    ? [run(parts[0] + '：', { bold: true }), run(parts.slice(1).join('：'))]
    : [run(t)];
  return new Paragraph({
    children, numbering: { reference: 'bul', level: 0 },
    spacing: { line: 320, after: 90 }
  });
}
function note(t) {
  return new Paragraph({
    children: [run(t, { size: 19, color: GREY })],
    spacing: { line: 300, before: 60, after: 160 },
    shading: { type: ShadingType.CLEAR, fill: 'FBF6EA' },
    border: { left: { style: BorderStyle.SINGLE, size: 14, color: GOLD, space: 8 } },
    indent: { left: 160 }
  });
}
function caption(t) {
  return new Paragraph({
    children: [run(t, { size: 18, color: GREY })],
    alignment: AlignmentType.CENTER, spacing: { after: 200 }
  });
}
function img(path, w, h) {
  return new Paragraph({
    children: [new ImageRun({ data: fs.readFileSync(path), type: 'png', transformation: { width: w, height: h } })],
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }
  });
}
function cell(t, o = {}) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: (Array.isArray(t) ? t : [t]).map(x =>
      new Paragraph({
        children: [run(String(x), { size: o.size || 20, bold: o.bold, color: o.color || TXT })],
        spacing: { line: 290, after: 0 }, alignment: o.align
      }))
  });
}
function mkTable(headers, rows, widths) {
  const bd = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((hh, i) => cell(hh, { w: widths[i], fill: NAVY, color: 'FFFFFF', bold: true }))
      }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, i) => cell(c, { w: widths[i], fill: ri % 2 ? ZEBRA : 'FFFFFF' }))
      }))
    ]
  });
}
function spacer(h) { return new Paragraph({ children: [], spacing: { after: h } }); }

/* ---------------- 页眉页脚 ---------------- */
function mkHeader(docName) {
  return new Header({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 3 } },
      spacing: { after: 60 },
      children: [
        new ImageRun({ data: LOGO, type: 'png', transformation: { width: 91, height: 32 } }),
        new TextRun({ text: '\t小瓦特·HR家族 · ' + docName, font: FONT, size: 17, color: GREY })
      ]
    })]
  });
}
function mkFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '第 ', font: FONT, size: 17, color: GREY }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 17, color: GREY }),
        new TextRun({ text: ' 页', font: FONT, size: 17, color: GREY })
      ]
    })]
  });
}

/* ---------------- 封面 ---------------- */
function cover(title1, title2, subtitle, infoRows) {
  const kw = 2600, vw = 5000;
  const bd = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
  return [
    spacer(900),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: LOGO, type: 'png', transformation: { width: 258, height: 91 } })],
      spacing: { after: 320 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 620 },
      children: [run('南方电网公司人力资源数智化创新产品评优 · 参赛项目', { size: 22, color: GREY })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 140 },
      children: [new TextRun({ text: title1, font: FONT, size: 52, bold: true, color: NAVY })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 500 },
      children: [new TextRun({ text: title2, font: FONT, size: 40, bold: true, color: TXT })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 900 },
      children: [run(subtitle, { size: 23, color: BLUE })]
    }),
    new Table({
      alignment: AlignmentType.CENTER,
      columnWidths: [kw, vw],
      width: { size: kw + vw, type: WidthType.DXA },
      borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd },
      rows: infoRows.map(([k, v], i) => new TableRow({
        children: [
          cell(k, { w: kw, fill: LIGHT, bold: true, align: AlignmentType.CENTER, size: 21 }),
          cell(v, { w: vw, fill: i % 2 ? ZEBRA : 'FFFFFF', size: 21 })
        ]
      }))
    }),
    new Paragraph({ children: [], pageBreakBefore: false })
  ];
}

/* ================= 文档一：陪练底座 ================= */
function docPeilian() {
  const c = [];
  c.push(...cover('「小瓦特·练」', 'AI智能陪练底座 · 需求文档',
    '本届展示模块：变电站倒闸操作陪练', [
    ['项目编号', '小瓦特·HR家族 01'],
    ['业务方', '深圳供电局 福田供电局'],
    ['业务联系人', '于然'],
    ['文档版本', 'V1.0'],
    ['编制日期', '2026年8月'],
    ['文档密级', '内部资料']
  ]));

  c.push(new Paragraph({ children: [], pageBreakBefore: true }));

  // 1 项目概述
  c.push(h1('一、项目概述'));
  c.push(h2('1.1 项目定位'));
  c.push(body('「小瓦特·练」是面向深圳供电局生产技能人员的对练式训练系统：学员与 AI 数字人教练在真实作业规程的约束下进行一对一对练，完成"听、指、说、做"的完整动作闭环，系统对每一个操作项逐项判定、逐项留痕，形成可追溯的训练记录。项目口径：大瓦特练机器，小瓦特练人。'));
  c.push(h2('1.2 业务问题'));
  c.push(bullet('倒闸操作等高风险作业的行为规范训练（唱票复诵、手指口述、验电接地顺序），目前依赖师带徒与集中演练，组织一次需要协调仿真场地、监护人与教员，人均可获得的演练频次有限；'));
  c.push(bullet('演练中的不规范动作依靠教员现场指出，纠错依赖教员个人经验，过程缺少逐项记录，训练结果难以量化与比对；'));
  c.push(bullet('新入职、转岗人员在取得独立操作资格前，缺少一个可以反复练习、允许出错的对练环境。'));
  c.push(h2('1.3 建设目标'));
  c.push(bullet('建成一个陪练底座与首个展示模块（倒闸操作）：学员可随时进入，与数字人监护人完成一次完整的"运行转检修"操作票对练；'));
  c.push(bullet('每次陪练形成六维评分与逐项过程记录；触碰安全红线即一票否决，并向学员展示事故后果推演；'));
  c.push(bullet('底座具备扩展能力：培训管理员基于一张现场电气操作票即可生成新的陪练剧本初稿，经人工校核后发布。'));

  // 2 使用人员
  c.push(h1('二、使用人员'));
  c.push(mkTable(['角色', '类型', '在系统中做什么'], [
    ['变电运行操作人（主要使用者）', '学员', '进入陪练舱与数字人监护人对练，查看评分复盘与成长档案'],
    ['监护人（陈志远）', '数字人（系统扮演）', '唱票、发出执行令、纠错、标注对勾，全程主导对练'],
    ['值班调度员（林岚）', '数字人（系统扮演）', '三段调度下令与接受汇报'],
    ['值班负责人（周建国）', '数字人（系统扮演）', '异常情况的接报与处置指挥'],
    ['班组长', '管理使用者', '查看班组看板，掌握覆盖率、频次与共性短板'],
    ['培训管理员', '管理使用者', '教练编辑、剧本生成与任务下发']
  ], [2950, 2300, 4500]));
  c.push(note('演示环节中出现的全部人员均为脱敏模拟人物，数字人形象为虚拟形象。'));
  c.push(mkTable(['项目组责任', '主要职责', '承担方'], [
    ['业务负责人', '把关业务事实与规程口径，提供素材，确认需求与验收', '业务方'],
    ['技术负责人', '技术路线选择与实现质量', '项目组'],
    ['项目负责人', '进度、节点与资源协调', '项目组'],
    ['演示负责人', '现场演示流程设计与讲解', '业务方与项目组共同']
  ], [2200, 5250, 2300]));

  // 3 现状与目标流程
  c.push(h1('三、现状流程与目标流程'));
  c.push(h2('3.1 现状：集中演练方式'));
  c.push(body('制定演练计划 → 协调仿真场地与教员 → 组织集中演练 → 教员现场口头点评 → 纸面记录归档。一次演练覆盖人数有限，两次演练之间学员没有可用的练习手段。'));
  c.push(h2('3.2 目标：随时可练的对练闭环'));
  c.push(body('学员登录工作台 → 选择陪练教练与练习方式 → 进入陪练舱与数字人监护人对练 → 系统逐项判定并生成评分复盘 → 结果写入个人成长档案，班组看板自动汇总。'));

  // 4 总体框架
  c.push(h1('四、总体框架'));
  c.push(img('/home/claude/build/arch_peilian.png', 620, 358));
  c.push(caption('图 1　「小瓦特·练」AI 智能陪练底座总体框架'));
  c.push(h2('4.1 陪练底座四引擎'));
  c.push(mkTable(['引擎', '职责'], [
    ['角色引擎', '数字人教练的人物设定、语音、口型、肢体动作与情绪反应；一场对练中按环节切换监护人、调度员、值班负责人三个角色'],
    ['剧本引擎', '把一项作业流程组织为逐项对练步骤，定义每一项的操作对象、位置、判定点与红线'],
    ['评分引擎', '六维计分（规程符合、操作顺序、双人核对、设备状态核对、风险辨识与异常处置、术语与记录）、红线一票否决、加分项'],
    ['复盘引擎', '按本场实际过程生成复盘：逐项回放、错误归因、依据条款、改进建议与课程推荐']
  ], [1900, 7850]));
  c.push(h2('4.2 与"人工智能知识课堂"的关系'));
  c.push(body('底座为主体，知识课堂作为供给层被底座调用：课程、题库、学时、学员画像四类资源接入底座；陪练完成后按学时规则回写知识课堂，复盘中的课程推荐直接指向知识课堂课程。'));
  c.push(h2('4.3 数字人教练'));
  c.push(body('三种呈现方式按运行环境自动选择：预渲染视频（离线环境可用，现场演示首选）、实时会话（联网环境，用于自由问答）、内置渲染（任何环境可用的保底方式）。三种方式下口型、肢体动作与语音均同源驱动。'));

  // 5 功能需求
  c.push(h1('五、功能需求'));
  c.push(h2('5.1 学员端'));
  c.push(mkTable(['页面', '功能要求'], [
    ['工作台', '待练任务、近期成绩、成长趋势、教练推荐；以数据看板形式呈现，图表可下钻'],
    ['AI教练中心', '按岗位族、业务域、能力项筛选陪练教练；教练卡展示难度、时长、已练人数；本届首发"倒闸操作·监护人陈志远"'],
    ['陪练舱（核心）', '功能明细见下表'],
    ['评分复盘', '六维雷达、否决项、逐项过程记录、依据条款、按本场过程生成的复盘文字、课程推荐'],
    ['成长档案', '能力雷达随时间演进、学习地图、学时记录']
  ], [2300, 7450]));
  c.push(spacer(60));
  c.push(mkTable(['陪练舱功能', '要求'], [
    ['数字人教练', '监护人唱票、发令、纠错、标注对勾；接令环节切换值班调度员，异常上报环节切换值班负责人'],
    ['五拍动作闭环', '唱票 → 手指口述 → 对，执行 → 执行 → 检查回报 → 标注对勾；任何一拍缺失即触发判定'],
    ['作业面板', '调度电话、五防电脑、监控后台一次接线图（设备状态实时变位）、间隔现场、测控屏、保护屏、就地控制柜七类作业位置'],
    ['教学引导', '教学、演练、考核三种模式；常驻任务指令条；随操作项自动切换的知识点卡；三级提示；知识地图；阶段预习'],
    ['红线判定', '未验电合接地刀闸等安全红线，触发即一票否决，并以动画展示事故后果推演与规程依据'],
    ['异常处置', '注入"设备位置指示不一致"等异常，训练"立即中止、逐级上报、研判恢复"的处置流程'],
    ['票令核对', '调度下令与操作票任务不一致的识别训练'],
    ['练习方式', '完整操作票、按状态分段、专项（验电接地、位置核对、接令核对）、错题重练'],
    ['随时提问', '学员任意时刻向教练提问，从安规与操作票管理细则知识库检索作答，并标注依据条款']
  ], [2300, 7450]));
  c.push(h2('5.2 管理端'));
  c.push(mkTable(['页面', '功能要求'], [
    ['班组看板', '陪练覆盖率、人均演练频次、班组与能力项交叉的短板分布、红线触发统计'],
    ['任务下发', '向班组指派陪练教练与完成期限，查看完成情况']
  ], [2300, 7450]));
  c.push(h2('5.3 底座层'));
  c.push(mkTable(['模块', '功能要求'], [
    ['教练编辑器', '角色设定、剧本步骤、评分规则、知识库挂载的可视化编辑；支持由一张现场电气操作票生成剧本初稿，人工校核后发布——这是底座扩展能力的核心证据'],
    ['知识课堂接入', '课程、题库、学时、学员画像四类资源的接入与学时回写']
  ], [2300, 7450]));

  // 6 本届展示模块
  c.push(h1('六、本届展示模块：变电站倒闸操作'));
  c.push(h2('6.1 素材依据（业务方已提供）'));
  c.push(bullet('《110kV培训三线1163线路由运行转检修操作细则及流程图》，含模拟操作脚本；'));
  c.push(bullet('现场电气操作票（27个操作项，三段调度令）及答案；'));
  c.push(bullet('《变电现场电气操作票管理细则》（脱敏版），含不合格、不规范判据附录；'));
  c.push(bullet('操作流程图五页（含异常处置流程）。'));
  c.push(h2('6.2 场景内容'));
  c.push(mkTable(['环节', '内容'], [
    ['上岗前准备', '操作票三审与资格核对、着装互检、人员状态确认、12项风险逐条确认'],
    ['五防模拟', '按操作票顺序完成模拟预演，顺序错误被防误逻辑拒绝'],
    ['逐项对练', '29个操作项（含主、子项），三段调度令，覆盖运行→热备用→冷备用→检修全过程'],
    ['安全红线', '6处红线判定点（未验电合接地刀闸、发现异常未中止等），触发即否决并推演后果'],
    ['异常注入', '1处"刀闸机械指示与后台显示不一致"，训练中止上报流程'],
    ['接令训练', '1处调度下令与票面不一致的核对训练点']
  ], [2300, 7450]));
  c.push(h2('6.3 数字人角色'));
  c.push(body('监护人陈志远、值班调度员林岚、值班负责人周建国，均为虚拟人物，按对练环节自动切换。'));

  // 7 演示范围
  c.push(h1('七、演示范围'));
  c.push(mkTable(['维度', '内容'], [
    ['一个主要使用者', '变电运行操作人'],
    ['一个核心场景', '倒闸操作陪练（110kV线路由运行转检修）'],
    ['一条完整流程', '接令 → 逐项操作 → 汇报 → 评分复盘；现场可选分段方式，8分钟内完整演示'],
    ['一个突出亮点', '数字人监护人主导的五拍动作闭环，与安全红线的事故后果推演'],
    ['一个价值结果', '一次对练全程逐项留痕，生成六维评分与复盘报告，写入成长档案']
  ], [2700, 7050]));
  c.push(h2('7.1 演示必须完成的功能'));
  c.push(bullet('陪练舱完整对练（教学模式，分段方式）；'));
  c.push(bullet('红线触发与事故后果推演；'));
  c.push(bullet('异常注入与中止上报流程；'));
  c.push(bullet('评分复盘与成长档案展示；'));
  c.push(bullet('教练编辑器"由操作票生成剧本初稿"演示。'));
  c.push(h2('7.2 本届不做'));
  c.push(mkTable(['事项', '说明'], [
    ['监护人视角对练', '进阶视角，列入下一版本'],
    ['语音发音质量评测计分', '本届以内容正确性判定为准'],
    ['移动端', '本届以大屏演示为准'],
    ['与生产系统对接', '演示环境独立运行，全部数据脱敏模拟'],
    ['虚拟现实设备', '本项目为纯软件形态']
  ], [3300, 6450]));

  // 8 数据与素材
  c.push(h1('八、数据与素材'));
  c.push(mkTable(['类别', '内容', '来源'], [
    ['作业规程素材', '操作细则、现场电气操作票、操作流程图、管理细则（脱敏版）', '业务方提供（已到位）'],
    ['知识内容', '知识点卡、教练台词、评分规则、知识地图九个主题', '项目组依据规程素材整理'],
    ['知识课堂资源', '课程、题库、学时规则、学员画像的接口口径', '业务方按需提供'],
    ['视觉规范', '南方电网企业色与标识使用规范', '业务方提供'],
    ['演示数据', '学员、班组、成绩等全部为脱敏模拟数据', '项目组生成']
  ], [2200, 5100, 2450]));

  // 9 技术路线
  c.push(h1('九、技术路线'));
  c.push(bullet('网页端应用，内网环境可运行，演示环境不依赖外部网络；'));
  c.push(bullet('数字人：预渲染视频、实时会话、内置渲染三档，按环境自动选择；'));
  c.push(bullet('语音：合成语音播报台词，学员可用语音输入完成复诵与回报；'));
  c.push(bullet('知识问答：基于安规与管理细则构建的结构化知识库检索作答；'));
  c.push(bullet('界面遵循南方电网视觉规范，页面左上角为深圳供电局标识。'));

  // 10 验收标准
  c.push(h1('十、验收标准'));
  c.push(mkTable(['序号', '可检查的验收项'], [
    ['1', '以教学模式完成一次分段陪练（冷备用转检修），全流程无阻断'],
    ['2', '五拍动作闭环逐项可见，任一拍缺失触发判定'],
    ['3', '未验电合接地刀闸触发一票否决，并展示事故后果推演与依据条款'],
    ['4', '注入位置指示不一致后，中止、上报、研判、恢复流程可完整走通'],
    ['5', '陪练结束生成六维评分、否决项与复盘文字，复盘内容与本场实际过程一致'],
    ['6', '教练编辑器完成"由操作票生成剧本初稿"演示'],
    ['7', '工作台、AI教练中心、评分复盘、成长档案、班组看板页面完整可操作'],
    ['8', '全部演示数据为脱敏模拟数据']
  ], [900, 8850]));

  // 11 里程碑
  c.push(h1('十一、里程碑'));
  c.push(mkTable(['阶段', '日期', '交付内容'], [
    ['需求澄清与范围定义', '8月14日', '需求工作坊，业务流程与素材确认'],
    ['技术方案设计与研发启动', '8月21日', '技术方案与界面框架'],
    ['需求冻结与初版演示验收', '8月28日', '陪练舱初版可演示'],
    ['中期评审与关键问题攻坚', '9月4日', '全部页面联通，数字人接入'],
    ['比赛作品预验收', '9月11日', '完整作品预演'],
    ['成果交付与模拟答辩', '9月23日', '最终交付，现场汇报演练']
  ], [3300, 1500, 4950]));

  // 12 边界与约定
  c.push(h1('十二、边界与约定'));
  c.push(bullet('演示环境不接入生产系统，不使用真实人员数据；'));
  c.push(bullet('涉及人员能力评价的输出仅作为训练参考，最终结论由人确认；'));
  c.push(bullet('数字人形象为虚拟人物，不对应任何真实员工；'));
  c.push(bullet('评优结束后如转入实际部署，数据接入与账号体系按公司数据管理要求另行确定。'));

  return build('AI智能陪练底座需求文档', c);
}

/* ================= 文档二：班组画像与班组长助手 ================= */
function docBanzu() {
  const c = [];
  c.push(...cover('「小瓦特·班」', '班组数字画像与班组长AI助手 · 需求文档',
    '本届展示场景：供电所班组月度管理', [
    ['项目编号', '小瓦特·HR家族 05'],
    ['业务方', '深圳供电局 光明供电局'],
    ['业务联系人', '林洁怡'],
    ['文档版本', 'V1.0'],
    ['编制日期', '2026年8月'],
    ['文档密级', '内部资料']
  ]));

  c.push(new Paragraph({ children: [], pageBreakBefore: true }));

  c.push(h1('一、项目概述'));
  c.push(h2('1.1 项目定位'));
  c.push(body('「小瓦特·班」是面向供电所班组长的班组管理助手：把散落在多个系统与台账中的班组人员信息汇聚成一屏数字画像，并配备一位可对话的 AI 助手，替班组长完成查数、备会、写初稿三类日常事务，全部输出由班组长确认后使用。'));
  c.push(h2('1.2 业务问题'));
  c.push(bullet('班组成员的资质证书、培训学时、出勤值班、任务安排、安全活动等信息分散在不同系统与台账中，班组长要掌握全貌需要逐处查看、手工汇集；'));
  c.push(bullet('班前会材料、月度班组工作总结等例行材料由班组长手工编写，占用大量工余时间；'));
  c.push(bullet('证书复审期限、学时达标进度等时限要求依靠个人记忆与手工台账跟踪，缺少统一的临期提醒入口。'));
  c.push(h2('1.3 建设目标'));
  c.push(bullet('一屏画像：班组人员结构、资质、学时、活动、任务、荣誉六类信息聚合呈现，图表可下钻到成员明细；'));
  c.push(bullet('三类事务闭环：查数即问即答、班前会材料一键生成初稿、月度总结一键生成初稿；'));
  c.push(bullet('全部输出定位为初稿与参考：由班组长修改确认后使用。'));

  c.push(h1('二、使用人员'));
  c.push(mkTable(['角色', '类型', '在系统中做什么'], [
    ['供电所班组长（主要使用者）', '使用者', '查看班组画像，向助手提问，生成并确认班前会材料与月度总结初稿'],
    ['班组成员', '被画像对象', '个人信息进入画像（演示环节全部为脱敏模拟人员）'],
    ['供电所管理人员', '管理使用者', '查看所内多班组画像总览'],
    ['人力资源部', '规则口径方', '提供资质、学时等管理口径']
  ], [3100, 2000, 4650]));
  c.push(mkTable(['项目组责任', '主要职责', '承担方'], [
    ['业务负责人', '把关业务事实与管理口径，提供台账样式，确认需求与验收', '业务方'],
    ['技术负责人', '技术路线选择与实现质量', '项目组'],
    ['项目负责人', '进度、节点与资源协调', '项目组'],
    ['演示负责人', '现场演示流程设计与讲解', '业务方与项目组共同']
  ], [2200, 5250, 2300]));

  c.push(h1('三、现状流程与目标流程'));
  c.push(h2('3.1 现状'));
  c.push(body('以月度总结为例：月末班组长逐个系统、逐本台账查看汇集 → 手工整理数据 → 编写总结 → 报送。班前会材料、临期跟踪同理，均为逐处查看、手工汇编。'));
  c.push(h2('3.2 目标'));
  c.push(body('数据装载 → 画像自动生成 → 班组长向助手提问、一键生成材料初稿 → 班组长修改确认 → 使用或报送。班组长的工作重心从"找数、抄数、排版"回到"判断与确认"。'));

  c.push(h1('四、总体框架'));
  c.push(img('/home/claude/build/arch_banzu.png', 620, 337));
  c.push(caption('图 1　「小瓦特·班」班组数字画像与班组长AI助手总体框架'));
  c.push(body('系统分三层：数据层装载六类班组信息（演示阶段以脱敏模拟数据装载）；画像层生成班组总览一屏、成员画像卡与临期提示；应用层为班组长AI助手与所级管理视图。'));

  c.push(h1('五、功能需求'));
  c.push(h2('5.1 班组数字画像'));
  c.push(mkTable(['功能', '要求'], [
    ['班组总览一屏', '人员结构、资质证书有效性、培训学时完成、安全活动开展、任务完成、荣誉记录六类信息；每张图表可下钻至成员明细'],
    ['成员画像卡', '个人基本信息、持证情况与复审期限、学时进度、近期工作记录'],
    ['临期与待办提示', '证书复审临期名单、学时未达标名单、待开展活动，按紧急程度排列']
  ], [2300, 7450]));
  c.push(h2('5.2 班组长AI助手'));
  c.push(mkTable(['功能', '要求'], [
    ['即问即答', '自然语言查询班组数据，例如"三个月内证书到期的有谁""本月学时未完成名单"，回答附数据来源'],
    ['班前会材料初稿', '一键生成当日材料初稿：工作安排、作业风险提示、学习内容建议'],
    ['月度总结初稿', '按班组当月画像数据一键生成月度工作总结初稿，数据与画像一致、来源可追溯'],
    ['任务安排参考', '按持证资质与近期工作量给出人选参考，安排由班组长决定'],
    ['待办提醒', '临期事项主动提示']
  ], [2300, 7450]));
  c.push(note('助手的每一项输出均在界面上标注"由班组长确认后使用"。涉及人员评价与资格判断的内容仅供参考，最终结论由人确认。'));
  c.push(h2('5.3 所级管理视图'));
  c.push(body('面向供电所管理人员的多班组画像总览：各班组人员、资质、学时、活动情况一屏呈现，支持进入任一班组查看详情。'));

  c.push(h1('六、演示范围'));
  c.push(mkTable(['维度', '内容'], [
    ['一个主要使用者', '供电所班组长'],
    ['一个核心场景', '月度班组管理：查数、备会、写总结'],
    ['一条完整流程', '打开班组画像 → 向助手提问 → 生成班前会材料初稿 → 生成月度总结初稿 → 班组长确认'],
    ['一个突出亮点', '一屏数字画像与即问即答'],
    ['一个价值结果', '一份可直接修改使用的月度总结初稿，每个数字可追溯到画像数据']
  ], [2700, 7050]));
  c.push(h2('6.1 演示必须完成的功能'));
  c.push(bullet('班组总览一屏与图表下钻；'));
  c.push(bullet('成员画像卡；'));
  c.push(bullet('助手回答名单类、统计类、临期类三类问题；'));
  c.push(bullet('班前会材料初稿与月度总结初稿一键生成；'));
  c.push(bullet('所级多班组总览。'));
  c.push(h2('6.2 本届不做'));
  c.push(mkTable(['事项', '说明'], [
    ['绩效评价自动打分', '人员评价结论由人作出，系统不输出评价结论'],
    ['真实数据接入', '演示阶段全部使用脱敏模拟数据，接入方案评优后另行确定'],
    ['移动端', '本届以大屏演示为准'],
    ['考勤原始数据采集', '以台账数据装载为准，不涉及采集设备']
  ], [3300, 6450]));

  c.push(h1('七、数据与素材'));
  c.push(mkTable(['数据类别', '主要字段', '演示口径'], [
    ['人员基本信息', '姓名、岗位、入职时间、班组', '脱敏模拟'],
    ['资质证书台账', '证书名称、取得时间、复审期限', '脱敏模拟'],
    ['培训学时', '要求学时、已完成学时、完成时间', '脱敏模拟'],
    ['出勤与值班', '出勤、值班安排', '脱敏模拟'],
    ['工作任务记录', '任务内容、时间、参与人', '脱敏模拟'],
    ['安全活动与荣誉', '活动开展记录、荣誉记录', '脱敏模拟']
  ], [2500, 4750, 2500]));
  c.push(body('业务方提供各类台账的字段样式与管理口径；模拟数据由项目组按样式生成。'));

  c.push(h1('八、技术路线'));
  c.push(bullet('网页端应用，内网环境可运行；'));
  c.push(bullet('画像层以多类型图表呈现，全部支持下钻；'));
  c.push(bullet('助手采用结构化数据查询与文稿初稿生成相结合的方式，回答附数据来源；'));
  c.push(bullet('界面遵循南方电网视觉规范，页面左上角为深圳供电局标识。'));

  c.push(h1('九、验收标准'));
  c.push(mkTable(['序号', '可检查的验收项'], [
    ['1', '班组总览一屏完整呈现六类信息，任一图表可下钻至成员明细'],
    ['2', '成员画像卡可打开且信息完整'],
    ['3', '助手正确回答名单类、统计类、临期类三类示例问题'],
    ['4', '班前会材料初稿一键生成，包含安排、风险、学习三要素'],
    ['5', '月度总结初稿一键生成，数据与画像一致'],
    ['6', '助手每项输出均标注"由班组长确认后使用"'],
    ['7', '所级多班组总览可进入任一班组'],
    ['8', '全部演示数据为脱敏模拟数据']
  ], [900, 8850]));

  c.push(h1('十、里程碑'));
  c.push(mkTable(['阶段', '日期', '交付内容'], [
    ['需求澄清与范围定义', '8月14日', '需求工作坊，业务口径与台账样式确认'],
    ['技术方案设计与研发启动', '8月21日', '技术方案与界面框架'],
    ['需求冻结与初版演示验收', '8月28日', '画像一屏初版可演示'],
    ['中期评审与关键问题攻坚', '9月4日', '助手三类问答与两类初稿联通'],
    ['比赛作品预验收', '9月11日', '完整作品预演'],
    ['成果交付与模拟答辩', '9月23日', '最终交付，现场汇报演练']
  ], [3300, 1500, 4950]));

  c.push(h1('十一、边界与约定'));
  c.push(bullet('演示环境不接入生产系统，全部数据为脱敏模拟数据；'));
  c.push(bullet('涉及人员评价与资格判断的内容仅供参考，最终结论由人确认；'));
  c.push(bullet('评优结束后如转入实际部署，数据接入与权限体系按公司数据管理要求另行确定。'));

  return build('班组数字画像与班组长AI助手需求文档', c);
}

/* ---------------- 组装 ---------------- */
function build(docName, children) {
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 21, color: TXT } } } },
    numbering: {
      config: [{
        reference: 'bul',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u25AA',
          style: { run: { color: BLUE, font: FONT }, paragraph: { indent: { left: 460, hanging: 240 } } }
        }]
      }]
    },
    sections: [{
      properties: {
        page: { margin: { top: 1360, bottom: 1180, left: 1290, right: 1290 } },
        titlePage: true
      },
      headers: { default: mkHeader(docName), first: new Header({ children: [] }) },
      footers: { default: mkFooter(), first: new Footer({ children: [] }) },
      children
    }]
  });
}

(async () => {
  fs.writeFileSync('/home/claude/build/需求文档_陪练底座.docx', await Packer.toBuffer(docPeilian()));
  fs.writeFileSync('/home/claude/build/需求文档_班组助手.docx', await Packer.toBuffer(docBanzu()));
  console.log('both docx written');
})();
