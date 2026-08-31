/* 两份参赛项目技术文档 · 与需求文档同版式 */
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
const CONTENT_W = 9750;

const run = (t, o = {}) => new TextRun(Object.assign({ text: t, font: FONT, size: 21, color: TXT }, o));
function body(t, o = {}) {
  return new Paragraph({ children: [run(t, o.run || {})], spacing: { line: 320, after: 130 }, alignment: o.align });
}
function h1(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 180, line: 300 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } },
    children: [new TextRun({ text: t, font: FONT, size: 31, bold: true, color: NAVY })]
  });
}
function h2(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 130, line: 300 },
    children: [new TextRun({ text: t, font: FONT, size: 25, bold: true, color: NAVY })]
  });
}
function bullet(t) {
  return new Paragraph({ children: [run(t)], numbering: { reference: 'bul', level: 0 }, spacing: { line: 320, after: 90 } });
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
  return new Paragraph({ children: [run(t, { size: 18, color: GREY })], alignment: AlignmentType.CENTER, spacing: { after: 200 } });
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
    children: (Array.isArray(t) ? t : [t]).map(x => new Paragraph({
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
      new TableRow({ tableHeader: true, children: headers.map((hh, i) => cell(hh, { w: widths[i], fill: NAVY, color: 'FFFFFF', bold: true })) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, { w: widths[i], fill: ri % 2 ? ZEBRA : 'FFFFFF' })) }))
    ]
  });
}
function spacer(h) { return new Paragraph({ children: [], spacing: { after: h } }); }
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
function cover(title1, title2, subtitle, infoRows) {
  const kw = 2600, vw = 5000;
  const bd = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
  return [
    spacer(900),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: LOGO, type: 'png', transformation: { width: 258, height: 91 } })], spacing: { after: 320 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 620 }, children: [run('南方电网公司人力资源数智化创新产品评优 · 参赛项目', { size: 22, color: GREY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 }, children: [new TextRun({ text: title1, font: FONT, size: 52, bold: true, color: NAVY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: title2, font: FONT, size: 40, bold: true, color: TXT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 }, children: [run(subtitle, { size: 23, color: BLUE })] }),
    new Table({
      alignment: AlignmentType.CENTER, columnWidths: [kw, vw],
      width: { size: kw + vw, type: WidthType.DXA },
      borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd },
      rows: infoRows.map(([k, v], i) => new TableRow({
        children: [cell(k, { w: kw, fill: LIGHT, bold: true, align: AlignmentType.CENTER, size: 21 }),
        cell(v, { w: vw, fill: i % 2 ? ZEBRA : 'FFFFFF', size: 21 })]
      }))
    })
  ];
}
function build(docName, children) {
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 21, color: TXT } } } },
    numbering: {
      config: [{
        reference: 'bul',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u25AA', style: { run: { color: BLUE, font: FONT }, paragraph: { indent: { left: 460, hanging: 240 } } } }]
      }]
    },
    sections: [{
      properties: { page: { margin: { top: 1360, bottom: 1180, left: 1290, right: 1290 } }, titlePage: true },
      headers: { default: mkHeader(docName), first: new Header({ children: [] }) },
      footers: { default: mkFooter(), first: new Footer({ children: [] }) },
      children
    }]
  });
}

/* ================= 技术文档一：陪练底座 ================= */
function techPeilian() {
  const c = [];
  c.push(...cover('「小瓦特·练」', 'AI智能陪练底座 · 技术文档',
    '依据《「小瓦特·练」AI智能陪练底座 需求文档》V1.0 编制', [
    ['项目编号', '小瓦特·HR家族 01'],
    ['业务方', '深圳供电局 福田供电局'],
    ['文档版本', 'V1.0'],
    ['编制日期', '2026年8月'],
    ['文档密级', '内部资料']
  ]));
  c.push(new Paragraph({ children: [], pageBreakBefore: true }));

  c.push(h1('一、文档说明'));
  c.push(body('本文档描述「小瓦特·练」AI 智能陪练底座本届参赛演示形态的技术实现方案，覆盖总体架构、核心引擎设计、数据设计、数字人呈现、质量保障与部署形态。凡涉及评优后实际部署的内容，均以"部署形态"单独标注。'));

  c.push(h1('二、总体技术架构'));
  c.push(img('/home/claude/build/tech_peilian.png', 620, 378));
  c.push(caption('图 1　技术架构：五层结构与运行环境'));
  c.push(mkTable(['层', '职责', '实现要点'], [
    ['呈现层', '八个页面的界面呈现与交互', '网页单页应用，南方电网视觉规范，宽屏自适应'],
    ['教学引导层', '把"该做什么"随时给到学员', '三种模式、任务指令条、知识点卡、三级提示、知识问答、阶段预习'],
    ['引擎层', '对练的判定与生成', '剧本、角色、评分、复盘四引擎与作业面板'],
    ['数据与知识层', '剧本、知识、台词、记录', '结构化数据内置于应用，本地留存错题记录'],
    ['数字人渲染层', '教练形象与口型动作', '预渲染视频、实时会话、内置渲染三档，自动降级']
  ], [1750, 3400, 4600]));

  c.push(h1('三、运行环境与部署形态'));
  c.push(mkTable(['形态', '说明', '适用场合'], [
    ['本地单文件', '整个应用打包为一个网页文件，浏览器双击打开，零安装、零后端', '比赛现场演示（首选）'],
    ['内网静态部署', '同一文件放置于内网静态服务器，浏览器访问', '局内试用'],
    ['门户内嵌', '以链接方式嵌入"人工智能知识课堂"门户入口', '部署形态']
  ], [2100, 5100, 2550]));
  c.push(bullet('浏览器要求：桌面版新式浏览器（谷歌内核或微软内核）；主演示分辨率 1680×950 及以上宽屏，界面自适应；'));
  c.push(bullet('演示全程不依赖外部网络：剧本、知识库、台词、模拟数据与数字人预渲染视频全部本地装载；'));
  c.push(bullet('语音播报使用浏览器内置中文语音；无语音包环境下自动转为静默播放，口型与字幕照常驱动。'));

  c.push(h1('四、剧本引擎'));
  c.push(h2('4.1 剧本数据结构'));
  c.push(body('一份陪练剧本由操作项序列构成。本届剧本共 29 个操作项（含主、子项）、三段调度令，与业务方提供的现场电气操作票逐项对应。每个操作项包含以下字段：'));
  c.push(mkTable(['字段', '含义', '示例（第 5 项）'], [
    ['项号 / 票面文字', '与操作票一致的编号与原文', '5　断开培训三线1163开关'],
    ['作业位置', '本项应在的位置（七类之一）', '监控后台'],
    ['操作对象', '本项应手指并操作的设备', '培训三线1163开关'],
    ['复诵口径', '学员应复诵的标准话术', '断开培训三线1163开关'],
    ['回报口径', '执行后应回报的内容要点', '开关已断开，位置与信号正确'],
    ['判定点', '本项启用的判定规则集合', '缺拍、错对象、无令操作'],
    ['红线埋点', '本项关联的一票否决条件', '（第 20 项：未验电合接地刀闸）'],
    ['依据条款', '规程原文摘录', '附录F 2.11.3 c）断开、合上的断路器'],
    ['知识点', '关联的知识主题与要点', '设备的四种状态；唱票复诵']
  ], [2300, 3350, 3800]));
  c.push(h2('4.2 五拍状态机'));
  c.push(img('/home/claude/build/tech_wupai.png', 620, 252));
  c.push(caption('图 2　五拍动作闭环状态机与两类分支'));
  c.push(body('每个操作项在五拍状态机内流转：唱票、手指口述、对，执行、执行、检查回报、标注对勾。状态推进由学员动作驱动，监护人台词与姿态随状态自动切换；任一拍缺失、越拍或对象错误即进入判定分支。'));
  c.push(h2('4.3 判定点类型'));
  c.push(mkTable(['类型', '触发条件', '处理'], [
    ['缺拍', '未手指即复诵、未复诵即执行等', '教学模式首次提醒，其余记不规范'],
    ['无令操作', '监护人未发"对，执行"即操作设备', '记严重违规'],
    ['对象错误', '手指或操作的设备与票面不符', '教学模式首次提醒，其余记违规'],
    ['跳项', '越过未完成项目直接执行后续项目', '记严重违规并要求返回'],
    ['走错间隔', '在非本项间隔进行核对或操作', '记严重违规'],
    ['单一指示', '刀闸位置仅核对一项指示即回报', '不予通过，要求四项核对齐全'],
    ['红线', '未验电合接地刀闸、发现异常仍继续等', '一票否决，展示事故后果推演与依据条款'],
    ['异常处置', '注入异常后学员的处置路径', '按中止、上报、研判、恢复四步判定']
  ], [1750, 4200, 3800]));

  c.push(h1('五、角色引擎与数字人呈现'));
  c.push(h2('5.1 三档呈现方式'));
  c.push(mkTable(['方式', '口型与动作来源', '适用环境', '说明'], [
    ['预渲染视频', '数字人服务批量渲染的透明通道视频（WebM 格式）', '离线，现场首选', '117 条台词逐条渲染，按台词精确匹配播放'],
    ['实时会话', '数字人服务实时流', '联网环境', '用于自由问答等非固定台词场合'],
    ['内置渲染', '矢量骨骼动画，拼音转口型逐字对齐', '任何环境', '保底方式，三档自动降级的最后一档']
  ], [1900, 3050, 1750, 3050]));
  c.push(h2('5.2 台词与口型'));
  c.push(bullet('台词清单共 117 条、4232 字，覆盖准备讲解、风险宣读、五防模拟、逐项唱票、口令、纠错点评、异常处置与收尾，按监护人、值班调度员、值班负责人三个角色分配；'));
  c.push(bullet('内置渲染下，台词逐字转拼音并映射为十类口型（开口、圆唇、扁唇、闭唇等），与语音时间轴逐字对齐；'));
  c.push(bullet('肢体动作与台词语义联动：唱票抬手指票、发令掌心前推、纠错摆指、制止前倾等八种姿态。'));
  c.push(h2('5.3 角色切换'));
  c.push(body('对练主线由监护人主导；进入接令环节自动切换为值班调度员，异常上报环节自动切换为值班负责人，环节结束切回。三个角色的形象、音色与台词相互独立。'));

  c.push(h1('六、评分与复盘引擎'));
  c.push(h2('6.1 六维计分'));
  c.push(mkTable(['维度', '采集事件', '计分方式'], [
    ['规程符合性', '判定点触发记录、提示使用次数', '基准分逐项扣减'],
    ['操作顺序与逻辑', '跳项、顺序颠倒、越拍', '按事件严重程度扣减'],
    ['双人核对执行', '缺拍、无令操作、对象错误', '按事件扣减'],
    ['设备状态核对', '四项指示核对完整性、回报质量', '按完整度记分'],
    ['风险辨识与异常处置', '红线规避、异常处置路径', '正确处置记加分'],
    ['调度术语与记录规范', '复诵吻合度、记录完整性', '按吻合度与完整度记分']
  ], [2500, 3700, 3550]));
  c.push(bullet('红线触发即一票否决：总评按否决处理，同时保留六维得分供复盘参考；'));
  c.push(bullet('加分项：主动发现异常并正确走完中止上报流程。'));
  c.push(h2('6.2 复盘生成'));
  c.push(body('对练过程以事件序列全程留痕（时间、操作项、节拍、事件类型、内容）。复盘文字按本场事件序列生成：练了哪一段、用时、红线与扣分归因、提示与提问使用情况、值得肯定的表现，逐段组装，保证复盘内容与本场过程一致。评分记录同时写入本地错题存储，供"错题重练"调用。'));

  c.push(h1('七、教学引导层'));
  c.push(mkTable(['模式', '指令与话术', '出错处理', '提示'], [
    ['教学模式', '任务指令条逐步给出，标准话术可见可跟读，监护人带路自动切换位置', '同类错误首次仅提醒，不计违规', '三级提示可用'],
    ['演练模式', '指令给方向，不给标准话术', '照常判定', '三级提示可用，使用留痕'],
    ['考核模式', '无指令无话术', '照常判定', '不提供提示']
  ], [1600, 3800, 2500, 1850]));
  c.push(bullet('任务指令条：按当前操作项与节拍推导"前往某处、手指某设备、复诵、执行、回报"步骤链，完成一步勾选一步；'));
  c.push(bullet('知识点卡：随操作项自动切换，含要做什么、常见错误、为什么、依据条款；仅在引入新知识主题时自动展开；'));
  c.push(bullet('三级提示：方向、要点、标准答案，每次使用记录并计入评分；'));
  c.push(bullet('知识问答：九个主题的结构化知识库，采用字组匹配检索，当前操作项关联主题加权，回答附依据条款出处；'));
  c.push(bullet('阶段预习：三段调度令前各弹出一张预习卡，列明本段必须掌握的三个知识点。'));

  c.push(h1('八、作业面板与防误逻辑'));
  c.push(bullet('七类作业位置：调度电话（含记录簿）、五防电脑、监控后台、间隔现场、测控屏、保护屏、就地控制柜；位置切换与操作项联动；'));
  c.push(bullet('监控后台一次接线图以矢量方式绘制：双母线七间隔，设备状态（带电、停电、接地）随操作实时变位，遥测数据联动；'));
  c.push(bullet('五防模拟按操作票顺序校验，顺序错误被防误逻辑拒绝并提示；'));
  c.push(bullet('间隔现场提供三个间隔可选，走错间隔触发判定，训练"先核对间隔名称"的习惯。'));

  c.push(h1('九、数据设计'));
  c.push(mkTable(['数据集', '规模', '内容'], [
    ['剧本数据', '29 项、三段调度令', '操作项全字段（见 4.1），六处红线埋点，一处异常注入，一处票令核对训练点'],
    ['知识库', '九个主题', '设备状态、三审票令、五防、唱票复诵、验电接地、位置核对、二次隔离、异常处置、调度记录；每条附规程出处'],
    ['台词清单', '117 条、4232 字', '按角色与环节标注，同时作为数字人预渲染的输入清单'],
    ['评分记录', '每场一份', '事件序列、六维得分、否决与加分、提示与提问记录；错题项写入本地存储'],
    ['模拟数据', '学员与班组', '人员、成绩、覆盖率等全部脱敏模拟']
  ], [1900, 2500, 5350]));

  c.push(h1('十、知识课堂接入设计'));
  c.push(mkTable(['资源', '方向', '用途'], [
    ['课程', '知识课堂 → 底座', '复盘中的课程推荐直接指向知识课堂课程'],
    ['题库', '知识课堂 → 底座', '知识点卡与预习卡的补充题源'],
    ['学时', '底座 → 知识课堂', '陪练完成后按学时规则回写'],
    ['学员画像', '双向', '底座读取岗位与能力标签，回写陪练能力标签']
  ], [1500, 2800, 5450]));
  c.push(note('本届演示以连接态视图呈现四类资源的接入关系与数据流向；实际接口对接在评优后按知识课堂接口规范实施。'));

  c.push(h1('十一、安全与合规'));
  c.push(bullet('演示形态为本地单文件运行，不向任何外部地址传输数据；'));
  c.push(bullet('全部人员与成绩数据为脱敏模拟数据，数字人为虚拟形象；'));
  c.push(bullet('涉及人员能力评价的输出仅作训练参考，界面与报告均以"训练参考"口径呈现，结论由人确认；'));
  c.push(bullet('部署形态的账号体系、数据接入与权限按公司数据管理要求另行设计。'));

  c.push(h1('十二、质量保障'));
  c.push(h2('12.1 自动化回归用例'));
  c.push(mkTable(['用例', '内容', '通过标准'], [
    ['全票通过', '完整操作票 29 项按规范逐项执行', '零违规走完，评分与复盘正常生成'],
    ['红线触发', '在第 20 项前跳过两项验电直接合接地刀闸', '一票否决弹出，后果推演播放，依据条款正确'],
    ['异常流程', '注入位置指示不一致后走中止上报', '五步处置流程完整，恢复后返回被中止项'],
    ['票令核对', '接令环节注入与票面不一致的下令', '未识别记违规，识别并中止记加分'],
    ['分段与专项', '八种练习方式逐一进入', '设备状态预置正确，范围外项目不可执行'],
    ['教学宽容', '教学模式下制造首次错误', '仅提醒不计违规，第二次照常判定']
  ], [1750, 4300, 3700]));
  c.push(h2('12.2 性能指标'));
  c.push(mkTable(['指标', '目标'], [
    ['应用体积', '单文件约 0.4 兆字节（不含数字人视频）；预渲染视频随包分发'],
    ['打开时间', '本地打开至可交互不超过 2 秒'],
    ['运行流畅度', '数字人动画与界面交互不低于每秒 30 帧'],
    ['分辨率适配', '1680×950 为主，1366×768 起可用']
  ], [2650, 7100]));

  c.push(h1('十三、运行降级设计'));
  c.push(mkTable(['场景', '降级行为'], [
    ['数字人预渲染视频缺失', '该条台词自动改用内置渲染，画面不中断'],
    ['实时会话不可用', '自动回落至预渲染或内置渲染'],
    ['浏览器无中文语音包', '静默播放，口型、动作与字幕照常'],
    ['低分辨率屏幕', '布局自适应收缩，功能不缺失']
  ], [3300, 6450]));

  c.push(h1('十四、技术任务与节点'));
  c.push(mkTable(['节点', '日期', '技术侧交付'], [
    ['技术方案设计', '8月21日', '本文档；界面框架与剧本数据结构定稿'],
    ['初版演示验收', '8月28日', '陪练舱完整可演示：五拍闭环、红线、异常、评分'],
    ['中期评审', '9月4日', '八页面联通；教学引导层完整；数字人预渲染视频接入'],
    ['比赛预验收', '9月11日', '全用例回归通过；演示脚本联调'],
    ['成果交付', '9月23日', '最终版本、部署说明与操作手册']
  ], [2400, 1500, 5850]));

  c.push(h1('十五、与验收标准的对应'));
  c.push(mkTable(['需求文档验收项', '技术实现落点'], [
    ['教学模式分段陪练无阻断', '五拍状态机 + 教学模式宽容判定（4.2、7）'],
    ['五拍闭环缺拍判定', '判定点类型"缺拍"（4.3）'],
    ['红线否决与后果推演', '红线埋点 + 否决处理（4.3、6.1）'],
    ['异常中止上报流程', '异常处置支线（4.2、4.3）'],
    ['复盘与本场过程一致', '事件序列驱动的复盘生成（6.2）'],
    ['操作票生成剧本初稿', '教练编辑器按剧本数据结构解析票面生成（4.1）'],
    ['五页面与班组看板可操作', '呈现层八页面（二、图1）'],
    ['演示数据脱敏', '模拟数据集与合规约定（9、11）']
  ], [4300, 5450]));

  return build('AI智能陪练底座技术文档', c);
}

/* ================= 技术文档二：班组助手 ================= */
function techBanzu() {
  const c = [];
  c.push(...cover('「小瓦特·班」', '班组数字画像与班组长AI助手 · 技术文档',
    '依据《「小瓦特·班」班组数字画像与班组长AI助手 需求文档》V1.0 编制', [
    ['项目编号', '小瓦特·HR家族 05'],
    ['业务方', '深圳供电局 光明供电局'],
    ['文档版本', 'V1.0'],
    ['编制日期', '2026年8月'],
    ['文档密级', '内部资料']
  ]));
  c.push(new Paragraph({ children: [], pageBreakBefore: true }));

  c.push(h1('一、文档说明'));
  c.push(body('本文档描述「小瓦特·班」班组数字画像与班组长AI助手本届参赛演示形态的技术实现方案，覆盖总体架构、数据模型、画像计算、助手问答、文稿生成、质量保障与部署形态。凡涉及评优后实际部署的内容，均以"部署形态"单独标注。'));

  c.push(h1('二、总体技术架构'));
  c.push(img('/home/claude/build/tech_banzu.png', 620, 337));
  c.push(caption('图 1　技术架构：四层结构与运行环境'));
  c.push(mkTable(['层', '职责', '实现要点'], [
    ['呈现层', '总览一屏、画像卡、助手对话、所级视图', '网页单页应用，多类型图表互不重复，全部可下钻'],
    ['应用逻辑层', '问答、文稿生成、提醒、确认机制', '意图识别 + 结构化查询 + 模板生成'],
    ['画像计算层', '指标口径、临期规则、聚合下钻', '统一口径计算，班组与成员两级联动'],
    ['数据层', '六类台账数据装载', '演示形态以脱敏模拟数据装载']
  ], [1900, 3650, 4200]));

  c.push(h1('三、运行环境与部署形态'));
  c.push(mkTable(['形态', '说明', '适用场合'], [
    ['本地单文件', '应用打包为一个网页文件，浏览器双击打开', '比赛现场演示（首选）'],
    ['内网静态部署', '文件置于内网静态服务器', '局内试用'],
    ['系统对接', '接入真实台账数据源与统一登录', '部署形态，按数据管理要求实施']
  ], [2100, 5100, 2550]));
  c.push(bullet('浏览器要求与分辨率口径与陪练底座一致：桌面新式浏览器，1680×950 为主，自适应；'));
  c.push(bullet('演示全程不依赖外部网络，数据与生成规则全部本地装载。'));

  c.push(h1('四、数据模型'));
  c.push(h2('4.1 以成员为中心的模型'));
  c.push(body('数据模型以班组成员为中心：证书、学时、出勤、任务、活动荣誉五类记录均挂接到成员，成员归属班组，班组归属供电所。三级归属关系支撑"所级总览 → 班组一屏 → 成员明细"的逐级下钻。'));
  c.push(mkTable(['数据集', '关键字段', '关联'], [
    ['成员', '姓名、岗位、入职时间、所属班组', '模型中心'],
    ['证书', '证书名称、取得时间、复审期限', '挂接成员，一人多证'],
    ['学时', '年度要求学时、已完成学时、完成时间', '挂接成员，按年度'],
    ['出勤值班', '出勤记录、值班安排', '挂接成员，按日'],
    ['任务', '任务内容、起止时间、参与人', '多对多挂接成员'],
    ['活动与荣誉', '安全活动记录、荣誉记录', '挂接班组或成员']
  ], [1900, 4350, 3500]));
  c.push(h2('4.2 模拟数据生成规则'));
  c.push(mkTable(['规则', '口径'], [
    ['规模', '一个供电所、三个班组、约三十名成员'],
    ['姓名与信息', '全部虚构生成，不对应任何真实员工'],
    ['分布设计', '刻意包含：证书临期者若干、学时滞后者若干、当月任务与活动记录若干，保证每类演示问题都有可见结果'],
    ['一致性', '总览图表、画像卡、助手回答、文稿初稿引用同一份数据，任一数字可交叉核对']
  ], [1900, 7850]));

  c.push(h1('五、画像计算层'));
  c.push(h2('5.1 指标口径'));
  c.push(mkTable(['信息类别', '指标', '计算口径'], [
    ['人员结构', '岗位分布、工龄分布', '按成员属性统计'],
    ['资质证书', '持证率、临期数', '临期＝复审期限距当日不足 90 天'],
    ['培训学时', '完成率、滞后名单', '已完成学时 ÷ 年度要求学时；进度落后于时间进度记滞后'],
    ['安全活动', '当月开展次数、参与率', '按活动记录统计'],
    ['任务', '当月任务量、人均任务数', '按任务记录统计'],
    ['荣誉', '当年荣誉数', '按荣誉记录统计']
  ], [1900, 2700, 5150]));
  c.push(h2('5.2 图表选型与下钻'));
  c.push(mkTable(['图表', '呈现内容', '下钻路径'], [
    ['环形图', '岗位结构', '点击扇区 → 该岗位成员名单'],
    ['横向条形图', '各成员学时完成率', '点击条目 → 成员画像卡'],
    ['日历热力图', '当月出勤与值班', '点击日期 → 当日值班明细'],
    ['时间线', '证书复审期限分布', '点击节点 → 证书明细'],
    ['折线图', '近六个月活动与任务趋势', '点击月份 → 当月记录'],
    ['榜单卡', '荣誉记录', '点击 → 荣誉详情']
  ], [1900, 3700, 4150]));
  c.push(note('图表类型互不重复，全部支持下钻，与工作台看板的呈现口径一致。'));

  c.push(h1('六、助手问答设计'));
  c.push(img('/home/claude/build/tech_qa.png', 620, 236));
  c.push(caption('图 2　问答与文稿生成处理流程'));
  c.push(h2('6.1 意图识别与查询映射'));
  c.push(mkTable(['意图类型', '示例问题', '查询映射'], [
    ['名单类', '三个月内证书到期的有谁', '证书表按复审期限筛选，返回名单与到期日'],
    ['统计类', '本月学时完成情况怎么样', '学时表聚合，返回完成率与滞后名单'],
    ['临期类', '最近有什么需要办的', '临期规则扫描，按紧急程度排序返回'],
    ['文稿类', '生成本月班组总结', '转入文稿生成流程（第七章）']
  ], [1750, 3300, 4700]));
  c.push(bullet('回答统一结构：结论一句话 + 名单或数字 + 数据来源标注（取自哪类台账、截至何时）；'));
  c.push(bullet('未命中意图时给出可问范围提示，不作凭空回答；'));
  c.push(bullet('演示形态采用内置规则完成意图识别与查询；部署形态预留大瓦特模型底座生成服务接口，识别与组装可切换至模型服务。'));

  c.push(h1('七、文稿初稿生成'));
  c.push(mkTable(['文稿', '结构', '数据槽位'], [
    ['班前会材料初稿', '当日工作安排 / 作业风险提示 / 学习内容建议', '当日任务与值班、任务类型对应的风险要点、近期学习主题'],
    ['月度总结初稿', '基本情况 / 安全工作 / 培训与持证 / 任务完成 / 存在不足 / 下月安排', '当月画像六类指标逐段填充，每处数字可回溯到画像数据']
  ], [2100, 3500, 4150]));
  c.push(bullet('模板文字与数据槽位分离：模板由业务口径确定，槽位由画像指标自动填充；'));
  c.push(bullet('每份初稿页面顶部固定标注"由班组长确认后使用"，编辑区可直接修改；'));
  c.push(bullet('初稿中的数字与画像数据联动，点击可跳转至对应图表核对。'));

  c.push(h1('八、所级管理视图'));
  c.push(body('对所内各班组的画像指标做同口径聚合：人员、持证、学时、活动、任务五类指标一屏呈现，点击任一班组进入该班组总览。所级视图复用画像计算层的同一套口径，保证两级数据一致。'));

  c.push(h1('九、安全与合规'));
  c.push(bullet('演示形态本地运行，不向任何外部地址传输数据；'));
  c.push(bullet('全部人员数据为脱敏模拟数据，虚构生成，不对应任何真实员工；'));
  c.push(bullet('涉及人员评价与资格判断的内容（任务安排参考、滞后名单等）仅供参考，界面固定标注"由班组长确认后使用"，系统不输出评价结论；'));
  c.push(bullet('部署形态的数据接入、权限与留痕按公司数据管理要求另行设计。'));

  c.push(h1('十、质量保障'));
  c.push(mkTable(['用例', '内容', '通过标准'], [
    ['总览完整性', '六类信息图表逐一打开并下钻', '类型互不重复，均可下钻到明细'],
    ['画像一致性', '总览、画像卡、助手回答交叉核对同一数字', '三处一致'],
    ['三类问答', '名单类、统计类、临期类各问两例', '结论正确，附数据来源'],
    ['班前会初稿', '一键生成', '三要素齐全，数据与当日一致'],
    ['月度总结初稿', '一键生成', '六段齐全，逐处数字可回溯'],
    ['确认标注', '检查助手全部输出', '均含"由班组长确认后使用"标注']
  ], [1900, 3900, 3950]));
  c.push(mkTable(['性能指标', '目标'], [
    ['应用体积', '单文件不超过 1 兆字节（含模拟数据）'],
    ['打开时间', '本地打开至可交互不超过 2 秒'],
    ['问答响应', '演示形态即问即答，不超过 1 秒']
  ], [2650, 7100]));

  c.push(h1('十一、技术任务与节点'));
  c.push(mkTable(['节点', '日期', '技术侧交付'], [
    ['技术方案设计', '8月21日', '本文档；数据模型与指标口径定稿'],
    ['初版演示验收', '8月28日', '班组总览一屏与画像卡可演示'],
    ['中期评审', '9月4日', '三类问答与两类文稿初稿联通；所级视图完成'],
    ['比赛预验收', '9月11日', '全用例通过；演示脚本联调'],
    ['成果交付', '9月23日', '最终版本、部署说明与操作手册']
  ], [2400, 1500, 5850]));

  c.push(h1('十二、与验收标准的对应'));
  c.push(mkTable(['需求文档验收项', '技术实现落点'], [
    ['总览一屏六类可下钻', '画像计算层 + 图表选型（五）'],
    ['成员画像卡', '成员中心数据模型（4.1）'],
    ['三类示例问答', '意图识别与查询映射（6.1）'],
    ['班前会初稿三要素', '文稿模板与数据槽位（七）'],
    ['月度总结与画像一致', '同源数据 + 数字回溯联动（4.2、七）'],
    ['确认后使用标注', '确认机制固定标注（七、九）'],
    ['所级总览可进入班组', '所级视图同口径聚合（八）'],
    ['演示数据脱敏', '模拟数据生成规则（4.2、九）']
  ], [4300, 5450]));

  return build('班组数字画像与班组长AI助手技术文档', c);
}

(async () => {
  fs.writeFileSync('/home/claude/build/技术文档_陪练底座.docx', await Packer.toBuffer(techPeilian()));
  fs.writeFileSync('/home/claude/build/技术文档_班组助手.docx', await Packer.toBuffer(techBanzu()));
  console.log('both tech docx written');
})();
