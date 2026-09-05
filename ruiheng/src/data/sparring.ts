/**
 * 智能陪练底座 —— 场景库 / 虚拟客户 / 本地剧本对话引擎 / 教练提示 / 合规红线 / 话术知识库 / 任务统计 / 多维评估。
 * 全部为本地确定性数据与规则，不请求网络；评分只写入本人能力画像。
 */
export type ObjectionType = 'price' | 'guarantee' | 'limit' | 'tenor' | 'competitor' | 'process' | 'evasion' | 'emotion' | 'none';
export const OBJECTION_LABEL: Record<ObjectionType, string> = {
  price: '价格', guarantee: '担保', limit: '额度', tenor: '期限', competitor: '竞品', process: '流程', evasion: '回避', emotion: '情绪', none: '无异议 · 可推进',
};

export interface VirtualRole { name: string; title: string; traits: string[]; mood: number; grad: string; initial: string }
export interface SparScene {
  id: string; title: string; category: string; difficulty: 1 | 2 | 3 | 4 | 5; products: string[];
  role: VirtualRole; goal: string; opening: string;
  /** 场景专属台词覆盖：按分支 id */
  replies?: Record<string, string>;
}

const G = {
  red: 'linear-gradient(135deg,#e85d55,#c3272b 55%,#8e1b1b)',
  gold: 'linear-gradient(135deg,#f7e2a5,#d9b45e 45%,#a9843a)',
  green: 'linear-gradient(135deg,#5fd3a0,#1f8a5a 55%,#155e3e)',
  blue: 'linear-gradient(135deg,#7fb0ff,#3a86ff 60%,#1d4ed8)',
  purple: 'linear-gradient(135deg,#c7a4ff,#9b5de5 60%,#6d28d9)',
  orange: 'linear-gradient(135deg,#ffb86b,#ff8c42 60%,#d9781b)',
  teal: 'linear-gradient(135deg,#7ae0f0,#00b4d8 60%,#0077a8)',
  pink: 'linear-gradient(135deg,#ffa3cd,#ff5da2 60%,#c2185b)',
};

export const SCENES: SparScene[] = [
  { id: 'first-visit', title: '首次拜访开场', category: '获客', difficulty: 2, products: ['智慧获客引擎', '客户全景洞察'], goal: '3 分钟内建立信任并拿到一个明确的后续动作', role: { name: '赵启明', title: '总经理', traits: ['务实', '时间紧'], mood: 55, grad: G.blue, initial: '赵' }, opening: '你们银行的客户经理每年都换一茬，今天来是又要我开户还是办卡？我只有十分钟。' },
  { id: 'dd-cfo', title: '尽调访谈：财务总监回避关键问题', category: '授信', difficulty: 4, products: ['财务智能诊断', '授信智能工作台'], goal: '就"其他应收款突增 1,900 万"获得可核实的解释', role: { name: '宋岚', title: '财务总监', traits: ['强势', '不耐烦'], mood: 40, grad: G.red, initial: '宋' }, opening: '报表都给你们了，数字自己看。还有什么非要当面问的？', replies: { 'evasion-1': '其他应收款那是集团内部往来的技术性处理，审计都没意见，你们一个客户经理纠结这个干什么？', 'evasion-2': '经销商的事情是销售部门的，和财务没关系，我不评论。', 'emotion-1': '……行，你态度还算诚恳。往来明细我可以让人整理一版，但只给核心科目。', 'process-1': '你们的流程我不关心，我只知道上次材料交了三遍。' } },
  { id: 'objection-rate', title: '异议处理："X 行 3.2% 还免担保"', category: '营销', difficulty: 3, products: ['沟通与话术助手', '方案设计与智能定价'], goal: '把讨论从单一利率拉回综合成本与服务价值', role: { name: '刘建波', title: '董事长', traits: ['精明', '爱比价'], mood: 48, grad: G.gold, initial: '刘' }, opening: 'X 行昨天来过了，3.2%，还免担保。你们要是给不到这个数，今天就别谈了。' },
  { id: 'renewal-price', title: '续贷谈判：客户要求降价', category: '存量经营', difficulty: 3, products: ['方案设计与智能定价', '客户全景洞察'], goal: '守住定价底线，用综合方案换取客户认可', role: { name: '陈雪', title: '财务经理', traits: ['温和', '有备而来'], mood: 52, grad: G.teal, initial: '陈' }, opening: '续贷我们是想做的，但今年市场利率都下来了，你们去年的定价不能再用了吧？' },
  { id: 'exec', title: '集团高管会谈（董事长）', category: '集团客户', difficulty: 5, products: ['集团客户作战室', '增值方案工坊'], goal: '获得董事长对集团统一授信与供应链方案的原则认可', role: { name: '陈晟', title: '晟禾食品集团董事长', traits: ['战略视角', '不耐烦细节', '重视效率'], mood: 42, grad: G.purple, initial: '陈' }, opening: '周总监，我给你二十分钟。你们行在我们集团的份额只有 4%，凭什么让我把统一授信放到你们这边？', replies: { 'limit-1': '3 个亿？你们连我们一家子公司都没做透，一口气要这么大份额，你们分行敢批吗？', 'competitor-1': '我不比银行，我比的是谁能把我们东南亚采购和冷链仓这两件事一起解决。', 'evasion-2': '彩晟那点事我知道，销售部在处理。你们要是拿这个来压价，那就不用谈了。', 'close-1': '可以，下周三上午你带方案来，财务总监也在。别带 PPT，带数字，带你们分行能拍板的人。', 'needs-1': '越南那边今年采购要到 4,000 万美元，汇率一波动一年就是几百万的差价。你们外汇上到底能做什么？' } },
  { id: 'credit-committee', title: '审贷会答辩', category: '授信', difficulty: 4, products: ['授信智能工作台', '合规与政策中枢'], goal: '清晰回答第一还款来源、担保与集中度质疑', role: { name: '何主任', title: '审贷委员会主任', traits: ['严谨', '追问到底'], mood: 50, grad: G.orange, initial: '何' }, opening: '客户经理，你的报告里第一还款来源写的是"经营现金流"，但去年经营现金流是负的，你怎么解释？', replies: { 'price-1': '定价不是审贷会关心的重点，我要听的是还款来源和风险缓释。', 'guarantee-1': '抵押物评估值 1.2 亿，抵押率你写了 70%，依据是什么？', 'evasion-1': '其他应收款 1,900 万没有解释清楚之前，这笔业务我不会投赞成票。', 'process-1': '流程的事不用你说，说风险。', 'close-1': '好，你把补充材料在三个工作日内提交，本委员会再议。' } },
  { id: 'postloan', title: '贷后风险沟通：客户被执行后', category: '贷后', difficulty: 4, products: ['贷后风险哨兵'], goal: '既维护关系又落实风险缓释措施（追加担保 / 提前还款安排）', role: { name: '孙志成', title: '彩晟商贸总经理', traits: ['焦虑', '防御'], mood: 35, grad: G.red, initial: '孙' }, opening: '被执行的事你们也知道了？那是和上家供应商的纠纷，我们已经在谈和解，你们不会现在就要抽贷吧？', replies: { 'emotion-2': '你们银行就是晴天送伞雨天收伞！', 'guarantee-1': '追加担保？我上哪找担保去，晟禾已经帮我担了 500 万。', 'emotion-1': '……谢谢你没有一上来就说抽贷。我们确实困难，但还款我一直在想办法。', 'close-1': '好，下周我把和解协议和回款计划给你，你们先别动账户。' } },
  { id: 'collection', title: '催收沟通', category: '贷后', difficulty: 3, products: ['贷后风险哨兵', '合规与政策中枢'], goal: '合规催收，锁定明确的还款时间与金额', role: { name: '马老板', title: '澄宇建材实际控制人', traits: ['拖延', '打感情牌'], mood: 45, grad: G.orange, initial: '马' }, opening: '小林啊，不是我不还，这个月几个工程款都没到，你再给我宽限半个月，我们这么多年关系了。', replies: { 'emotion-1': '你是个明白人。这样，下周五我先还 30 万，剩下的月底。', 'process-1': '什么逾期上报？你们非要把事情做绝吗？', 'emotion-2': '你们行就是不讲情面！', 'close-1': '行，我给你个准信：25 号前还 50 万，我签个还款承诺。' } },
  { id: 'cross-dept', title: '跨部门协调：与信审 / 风险经理', category: '协作', difficulty: 3, products: ['授信智能工作台', '智能办公协作'], goal: '用数据说服风险经理放行，并接受合理的风险缓释条件', role: { name: '吴锐', title: '风险经理', traits: ['谨慎', '就事论事'], mood: 50, grad: G.teal, initial: '吴' }, opening: '这笔宁桂精密的授信我看了，其他应收款突增 1,900 万没有说明，我这里过不了。', replies: { 'price-1': '定价我不管，我只看第一还款来源和这 1,900 万去哪了。', 'evasion-1': '客户"技术性处理"四个字我不接受，要合同和银行流水。', 'guarantee-2': '如果能把车企的定点订单做成应收账款质押，加上实控人连带，我可以有条件同意。', 'process-2': '并行推进可以，但我的补充调查清单你必须逐项回复。', 'close-1': '好，你今天下班前把流水和订单发我，我明天上午给意见。' } },
  { id: 'complaint', title: '客户投诉处理', category: '服务', difficulty: 2, products: ['沟通与话术助手'], goal: '先安抚情绪，再给出明确的解决路径与时限', role: { name: '周敏', title: '出纳', traits: ['委屈', '情绪激动'], mood: 25, grad: G.pink, initial: '周' }, opening: '我们的工资发放又被卡了！网银今天第三次提示"待复核"，员工都在群里骂人，你们到底怎么回事？', replies: { 'emotion-1': '……好吧，我也是被老板骂了才这么急。你们什么时候能解决？', 'process-1': '不要跟我说流程，我要今天下午三点前员工能收到工资。', 'process-2': '你现在就打电话？行，我等你消息，别再让我打过去。', 'emotion-2': '又是"系统问题"？每次都这一句！', 'close-1': '行，那你下午两点前给我回复，我先去安抚员工。' } },
  { id: 'scf-pitch', title: '供应链金融方案推介', category: '营销', difficulty: 3, products: ['集团客户作战室', '方案设计与智能定价'], goal: '让核心企业理解确权对自身的价值并同意试点', role: { name: '林国栋', title: '晟禾粮油采购总监', traits: ['务实', '怕麻烦'], mood: 50, grad: G.green, initial: '林' }, opening: '反向保理我听过，就是让我们给供应商确权嘛。多一道手续，对我们有什么好处？' },
  { id: 'fx-pitch', title: '跨境结汇 / 锁汇产品推介', category: '营销', difficulty: 3, products: ['方案设计与智能定价', '行业与宏观研判'], goal: '把汇率风险讲清楚，推动远期购汇试单', role: { name: 'Nguyen 阮氏梅', title: '越南公司财务负责人', traits: ['谨慎', '数据驱动'], mood: 55, grad: G.blue, initial: '阮' }, opening: '我们一直是现汇付款，汇率涨跌都是市场的事。锁汇要交保证金吧？我看不出必要性。' },
  { id: 'bill-pitch', title: '票据业务推介', category: '营销', difficulty: 2, products: ['方案设计与智能定价'], goal: '用银承替代部分现金付款，落地保证金存款', role: { name: '郑总', title: '融岚软件总经理', traits: ['开放', '不懂票据'], mood: 60, grad: G.gold, initial: '郑' }, opening: '票据？我们软件公司都是电汇结算，供应商也没提过要票。这东西对我有啥用？' },
  { id: 'deposit', title: '结算户存款提升', category: '存量经营', difficulty: 2, products: ['客户全景洞察', '智慧获客引擎'], goal: '把结算量上升的餐饮客户转化为存款与代发', role: { name: '嘉禾餐饮 王总', title: '连锁餐饮创始人', traits: ['热情', '注意力分散'], mood: 62, grad: G.pink, initial: '王' }, opening: '最近新开了四家店，流水是涨了，但钱都压在货和装修上，哪来的存款？' },
];
export const sceneById = (id?: string | null) => SCENES.find((s) => s.id === id) ?? SCENES[0];

/* ---------------- 对话引擎：关键词分支 ---------------- */
export interface Branch { id: string; type: ObjectionType; keywords: string[]; replies: string[]; moodDelta: number }
export const BRANCHES: Branch[] = [
  { id: 'price-1', type: 'price', keywords: ['利率', '定价', 'bp', '加点', 'LPR', '价格', '报价', '个点'], moodDelta: -6, replies: ['你们这个价格没有竞争力。X 行给我 3.2% 还免担保，你们 LPR 加 45 个点是什么意思？', '价格还是这么高？我上个月问的时候你们说会争取，现在呢？'] },
  { id: 'price-2', type: 'price', keywords: ['综合成本', '综合', '全流程', '隐性', '实际成本', '一揽子', '综合收益', '测算', '算一笔账'], moodDelta: 2, replies: ['综合成本？你把账算给我看，别跟我讲概念。', '好，你说的这个综合方案，落到我每年多花还是少花多少钱？'] },
  { id: 'guarantee-1', type: 'guarantee', keywords: ['担保', '抵押', '保证人', '质押', '增信', '保证金', '连带'], moodDelta: -4, replies: ['抵押我们没有多余的资产了，厂房都押在 X 行。信用贷款你们做不做？', '又要担保？实控人连带责任你们每家银行都要，凭什么？'] },
  { id: 'guarantee-2', type: 'guarantee', keywords: ['信用', '应收账款', '订单', '确权', '保理', '应收'], moodDelta: -2, replies: ['应收账款质押？我们下游经销商不会配合确权的，太麻烦。', '订单融资听起来可以，但车企的合同有保密条款，我不方便给你们。'] },
  { id: 'limit-1', type: 'limit', keywords: ['额度', '规模', '多少钱', '总量', '授信', '亿'], moodDelta: -3, replies: ['3 个亿？我们全行业授信都 4.5 亿了，你们才做 2,000 万，凭什么一下子要这么大份额？', '额度先别说大话，你们分行到底能批多少？'] },
  { id: 'limit-2', type: 'limit', keywords: ['分期', '逐步', '先做', '首批', '试点', '第一步', '分阶段'], moodDelta: 5, replies: ['先做一部分可以谈，但要看你们审批速度。', '试点可以，但我不想为一个试点折腾一整套材料。'] },
  { id: 'tenor-1', type: 'tenor', keywords: ['期限', '一年', '三年', '五年', '年期', '长期', '还款方式', '分期还', '中长期'], moodDelta: -3, replies: ['一年期对我们没意义，冷链仓建设周期就 18 个月，你们能给三年以上吗？', '还款方式我要按季付息、到期还本，你们这种等额本息我不接受。'] },
  { id: 'competitor-1', type: 'competitor', keywords: ['X行', '其他银行', '同业', '他行', '别的银行', '竞争', '对比'], moodDelta: -4, replies: ['我不关心你们和 X 行的比较，我只看谁给的条件好、谁办得快。', '别说别人家的不好，你先说你们能做什么。'] },
  { id: 'competitor-2', type: 'competitor', keywords: ['优势', '差异', '特点', '本行', '我们行', '服务', '团队', '专属'], moodDelta: -5, replies: ['服务谁都会说，去年你们换了三个客户经理，这算服务吗？', '"专属团队"这个词我听了十年了，落到实处是什么？'] },
  { id: 'process-1', type: 'process', keywords: ['流程', '审批', '多久', '材料', '时间', '几天', '周期', '效率', '上报'], moodDelta: -3, replies: ['上次续贷你们审了两个月，这次如果还要两个月，我就不等了。', '材料清单我看了，比 X 行多一倍，你们能不能精简？'] },
  { id: 'process-2', type: 'process', keywords: ['绿色通道', '并行', '预审', '加快', '提前', '一周', '十个工作日', '当天', '今天下午', '马上'], moodDelta: 3, replies: ['十个工作日？你说的话能算数吗，我要你们行长的承诺。', '好，那你今天就把清单发我，我让财务准备。'] },
  { id: 'evasion-1', type: 'evasion', keywords: ['其他应收款', '往来', '关联', '资金去向', '用途', '流向', '说明一下', '解释', '为什么', '原因'], moodDelta: -4, replies: ['这个是财务上的技术处理，没什么好说的。我们聊聊额度吧。', '你问的这些审计师都看过了，没问题。下一个问题。'] },
  { id: 'evasion-2', type: 'evasion', keywords: ['彩晟', '经销商', '被执行', '担保500', '风险', '预警', '执行'], moodDelta: -6, replies: ['彩晟的事我们在处理，跟这次授信没关系，你们不要因为这个卡我们。', '经销商出问题是正常的商业风险，你们银行是不是太敏感了？'] },
  { id: 'emotion-1', type: 'emotion', keywords: ['理解', '感受', '抱歉', '冒昧', '辛苦', '感谢', '站在您', '确实', '您的顾虑', '不容易'], moodDelta: 8, replies: ['行吧，你倒是会说话。说说你们到底能做什么。', '……嗯，你能这么想我还是认可的。继续。'] },
  { id: 'emotion-2', type: 'emotion', keywords: ['不行', '没办法', '做不了', '规定', '制度不允许', '只能这样', '不可能'], moodDelta: -9, replies: ['什么都做不了，那我们还谈什么？', '规定规定，你们银行永远是规定，客户的事永远排后面。'] },
  { id: 'needs-1', type: 'none', keywords: ['今年计划', '规划', '扩张', '东南亚', '越南', '采购', '付汇', '锁汇', '汇率', '想听听', '怎么看'], moodDelta: 6, replies: ['东南亚采购今年要到 4,000 万美元，汇率波动让我们头疼，你们外汇上有什么办法？', '今年的重点是冷链仓和预制菜，钱主要花在这两块。你们能跟上节奏吗？'] },
  { id: 'supply-1', type: 'none', keywords: ['供应商', '上游', '反向保理', '供应链', '账期', '核心企业'], moodDelta: 6, replies: ['上游供应商确实老在催款，如果能帮他们融资、我们账期还能延长，那倒是可以听听。', '确权要占用我们的授信额度吗？我不想因为帮供应商把自己的额度用掉。'] },
  { id: 'close-1', type: 'none', keywords: ['下一步', '下周', '安排', '拜访', '方案', '会谈', '董事长', '约个时间', '签', '当面'], moodDelta: 7, replies: ['可以，下周三上午你带方案来，董事长也在。别带 PPT，带数字。', '那就这么定，你把要点先发我邮箱，见面直接过。'] },
];
export const DEFAULT_BRANCH: Branch = { id: 'default', type: 'none', keywords: [], moodDelta: -1, replies: ['嗯，你继续说。（对方低头看了一眼手机）', '这个我需要和财务再商量。', '说重点。', '你们行的方案我看过了，没什么新意。'] };
export const branchById = (id: string) => BRANCHES.find((b) => b.id === id) ?? DEFAULT_BRANCH;

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
export function pickBranch(input: string, scene: SparScene, used: Record<string, number>): { branch: Branch; reply: string; hits: number } {
  const t = norm(input);
  let best: { b: Branch; hits: number; used: number; idx: number } | null = null;
  BRANCHES.forEach((b, idx) => {
    const hits = b.keywords.reduce((n, k) => n + (t.includes(norm(k)) ? 1 : 0), 0);
    if (hits === 0) return;
    const u = used[b.id] ?? 0;
    if (!best || hits > best.hits || (hits === best.hits && u < best.used) || (hits === best.hits && u === best.used && idx < best.idx)) best = { b, hits, used: u, idx };
  });
  const chosen: { b: Branch; hits: number; used: number } = best ?? { b: DEFAULT_BRANCH, hits: 0, used: used[DEFAULT_BRANCH.id] ?? 0 };
  const b = chosen.b;
  const override = chosen.used === 0 ? scene.replies?.[b.id] : undefined;
  const reply = override ?? b.replies[chosen.used % b.replies.length];
  return { branch: b, reply, hits: chosen.hits };
}

/* ---------------- 合规红线 ---------------- */
export interface RedLine { id: string; pattern: RegExp; label: string; hint: string }
export const RED_LINES: RedLine[] = [
  { id: 'promise', pattern: /保证|一定能批|肯定能批|包批|百分之百|绝对没问题/, label: '承诺审批结果', hint: '审批结果由授信审批部门决定，不得向客户作任何承诺性表述。' },
  { id: 'disparage', pattern: /比.{0,6}(行|银行).{0,4}(差|烂|不行|垃圾)|(他行|别的银行|X\s?行).{0,8}(不靠谱|坑|没我们|不如我们|差)/, label: '贬损同业', hint: '不得诋毁、贬低其他金融机构，只陈述本行方案的事实与价值。' },
  { id: 'bribe', pattern: /返点|回扣|好处费|请客|送礼/, label: '廉洁红线', hint: '严禁以任何形式向客户输送或收受利益。' },
  { id: 'evade', pattern: /内部消息|监管不查|绕过|规避监管|钻空子|打擦边球/, label: '规避监管', hint: '不得暗示可以规避监管要求或内部制度。' },
  { id: 'mislead', pattern: /保本|无风险|稳赚|零风险|一定赚/, label: '误导性表述', hint: '涉及产品收益与风险时不得使用保本、无风险等误导性表述。' },
  { id: 'fake', pattern: /随便填|帮你做材料|包装一下|做高|做平|美化报表/, label: '协助造假', hint: '严禁协助或暗示客户提供不真实的申请材料。' },
];
export const checkRedLines = (text: string) => RED_LINES.filter((r) => r.pattern.test(text));

/* ---------------- 教练提示（按异议类型） ---------------- */
export const COACH_TIPS: Record<ObjectionType, { detect: string; suggest: string }> = {
  price: { detect: '客户抛出价格异议，正在把讨论压缩到单一利率', suggest: '我理解您对利率的关注。我们把综合成本测算给您看：利率之外，派生存款利息、结算手续费减免和供应链保理给供应商省下的成本，加起来算一笔账，实际成本未必高于 3.2%。' },
  guarantee: { detect: '客户对担保 / 增信方式有抵触', suggest: '担保上我们不一定要新增抵押。可以用核心企业确权的应收账款和车企订单做主要缓释，实控人只做有限连带，这样不占用您现有资产。' },
  limit: { detect: '客户质疑额度合理性或本行承接能力', suggest: '额度我们建议分阶段：首批先做银承和保理试点，跑顺流程后再逐步上量，这样对您和我们行都更稳妥。' },
  tenor: { detect: '客户对期限 / 还款方式不满', suggest: '期限上冷链仓这种项目我们按中长期固定资产贷款设计，三年以上、按季付息，与建设周期和现金流匹配。' },
  competitor: { detect: '客户拿竞争对手条件施压', suggest: '我不评价其他银行的方案。我们的差异在于把东南亚采购、冷链仓和供应链三件事放在一个方案里解决，由专属团队全程跟进。' },
  process: { detect: '客户担心审批流程慢、材料多', suggest: '流程上我们已经启动预审，材料清单精简到 8 项，尽调与评估并行推进，目标十个工作日内出批复意见。' },
  evasion: { detect: '客户回避关键问题（其他应收款 / 经销商风险）', suggest: '我理解这可能涉及内部安排。为了让审批顺利，我们只需要往来明细和对应合同，这也是为了保护贵司的授信额度不被打折扣。' },
  emotion: { detect: '客户情绪波动，需先安抚再推进', suggest: '您说得对，我们确实有做得不够的地方。您的顾虑我记下了，今天先把最要紧的两件事定下来，其他的我回去马上落实。' },
  none: { detect: '客户释放积极信号，可推进下一步', suggest: '那我们下一步这样安排：下周我带完整方案来拜访，当面把数字过一遍，您看安排在周三上午可以吗？' },
};

/* ---------------- 话术知识库（行方审定） ---------------- */
export interface KnowledgeItem { title: string; text: string }
export const KNOWLEDGE: { cat: string; tone: string; items: KnowledgeItem[] }[] = [
  { cat: '开场', tone: 'gold', items: [
    { title: '价值切入开场', text: '赵总，我今天不是来推销产品的。我们注意到贵司近半年结算量上升了 28%，想用十分钟聊聊怎么把这部分资金效率再提一提。' },
    { title: '行业事件开场', text: '最近预制菜赛道增速 18%，我们服务的三家同行都在做冷链扩建，想听听您对今年产能规划的判断。' },
    { title: '转介绍开场', text: '晟禾粮油的林总监建议我来拜访您，他们做了反向保理后供应商账期延长到了 90 天。' },
  ] },
  { cat: '需求挖掘', tone: 'green', items: [
    { title: '开放式提问', text: '您今年最想解决的资金问题是哪一件？是采购付款的节奏，还是项目建设的中长期资金？' },
    { title: '现状—影响提问', text: '上游账期 60 天对供应商来说压力大吗？他们有没有因此提过涨价或者缩短账期？' },
    { title: '决策链确认', text: '这个方案如果推进，除了您之外还需要哪几位参与决策？我们提前把材料准备到位。' },
  ] },
  { cat: '异议', tone: 'red', items: [
    { title: '价格异议：算综合账', text: '利率只是成本的一部分。把派生存款、结算减免和供应商融资节省合在一起算，我们把这笔账做成一页纸给您。' },
    { title: '担保异议：缓释替代', text: '我们不一定新增抵押，可以用确权应收账款做主要缓释，实控人只做有限连带。' },
    { title: '流程异议：并行承诺', text: '我们已启动预审，材料精简到 8 项，尽调与评估并行，目标十个工作日内出意见。' },
  ] },
  { cat: '收尾', tone: 'purple', items: [
    { title: '明确下一步', text: '那我们下一步这样安排：周三上午我带方案和分行领导一起来，当面把数字过一遍。' },
    { title: '小承诺收尾', text: '今天先把开户和预审材料清单定下来，其他条款我们下次见面再谈，您看可以吗？' },
    { title: '总结确认', text: '我总结一下今天达成的三点：额度分阶段、担保用确权应收、十个工作日出意见。有遗漏请您指正。' },
  ] },
];

/* ---------------- 任务与统计 ---------------- */
export interface SparTask { title: string; from: string; due: string; done: number; total: number; status: '进行中' | '已完成' | '待开始' }
export const TASKS: SparTask[] = [
  { title: '异议处理对练 3 场（≥70 分）', from: '黄建国 · 支行行长', due: '周五', done: 2, total: 3, status: '进行中' },
  { title: '尽调访谈：财务总监回避场景', from: '周慧敏 · 团队负责人', due: '周三', done: 1, total: 1, status: '已完成' },
  { title: '集团高管会谈预演（晟禾）', from: '周慧敏 · 团队负责人', due: '周四', done: 0, total: 1, status: '待开始' },
  { title: '合规话术复训（催收 / 投诉）', from: '合规部', due: '本月', done: 2, total: 2, status: '已完成' },
];
export const WEEK_DONE = { done: 5, total: 8 };
export const TEAM_AVG = [
  { k: '开场', me: 72, team: 74 }, { k: '需求', me: 61, team: 68 }, { k: '异议', me: 58, team: 63 },
  { k: '合规', me: 84, team: 82 }, { k: '收尾', me: 55, team: 57 },
];
export const HISTORY = [{ d: '8/14', s: 55 }, { d: '8/21', s: 58 }, { d: '8/28', s: 61 }, { d: '9/02', s: 64 }];

/* ---------------- 示范回合（6 轮，示范得分 62） ---------------- */
export const DEMO_LINES = [
  '陈董您好，感谢您抽时间。我们注意到集团今年在东南亚采购上增长很快，想听听您对汇率和资金安排的想法。',
  '这块我们可以用远期购汇锁汇配合付汇，利率方面我们可以做到 LPR 加 45 个点。',
  '我保证这个价格能批下来，X 行的方案没我们的好。',
  '理解您的顾虑，我们把综合成本测算给您看：加上派生存款和结算减免，实际成本比 3.2% 还低。',
  '供应链这块，我们可以给上游 30 家供应商做反向保理，用集团确权，供应商融资成本降下来，集团账期还能延长。',
  '那我下周三带完整方案来拜访，和董事长当面过数字，您看安排可以吗？',
];
export const DEMO_DIMS = [66, 60, 58, 55, 64, 68, 48, 70, 57, 74];

/* ---------------- 多维评估 ---------------- */
export const EVAL_DIMS = ['专业度', '逻辑结构', '说服力', '需求挖掘', '异议处理', '产品匹配', '合规性', '共情倾听', '成交推进', '礼仪表达'];
export interface Turn { role: 'me' | 'ai'; text: string; branchId?: string; type?: ObjectionType; mood?: number; redLines?: string[]; delta?: number }
export interface Review { original: string; comment: string; better: string; flag?: 'red' | 'gold' | 'green' }
export interface Report { score: number; dims: { dim: string; score: number }[]; strengths: string[]; improves: string[]; compliance: { label: string; tone: 'green' | 'red' }[]; reviews: Review[]; history: { d: string; s: number }[] }

const REVIEW_RULES: Record<string, { comment: string; better: string }> = {
  'price-1': { comment: '报价直接抛出、未先铺垫综合价值，把客户拉进了单一利率比较。', better: COACH_TIPS.price.suggest },
  'price-2': { comment: '把讨论从利率拉回综合成本，方向正确；建议给出一页纸测算而非口头概念。', better: '我把派生存款、结算减免和供应商融资节省做成一页纸的测算，明天上午发您，数字都可核。' },
  'guarantee-1': { comment: '直接谈担保容易触发抵触，应先给替代缓释方案。', better: COACH_TIPS.guarantee.suggest },
  'guarantee-2': { comment: '提出应收 / 订单类缓释是好方向，但要预判客户"下游不配合"的顾虑。', better: '确权流程由我们对接经销商线上完成，贵司只需在系统里点一次确认，不增加财务工作量。' },
  'limit-1': { comment: '额度诉求过大且缺乏铺垫，让客户质疑本行承接能力。', better: COACH_TIPS.limit.suggest },
  'limit-2': { comment: '分阶段建议降低了客户决策门槛，推进有效。', better: '首批先做银承 4,000 万和保理试点，跑顺后一个季度内再上量。' },
  'tenor-1': { comment: '期限没有与项目建设周期匹配，被客户抓住。', better: COACH_TIPS.tenor.suggest },
  'competitor-1': { comment: '提及竞争对手时要避免比较式表述，只陈述本行方案价值。', better: COACH_TIPS.competitor.suggest },
  'competitor-2': { comment: '"服务 / 团队"过于空泛，需落到具体承诺。', better: '专属团队由我和产品经理、国际业务经理三人组成，方案期内每周一次进度同步，您随时可以找到我。' },
  'process-1': { comment: '谈流程时没有先给承诺，引发客户对时效的担忧。', better: COACH_TIPS.process.suggest },
  'process-2': { comment: '给出了明确时效承诺，注意措辞为"目标"而非"保证"。', better: '目标十个工作日内出意见，如有变化我第一时间同步。' },
  'evasion-1': { comment: '关键问题问得对，但方式偏直接，客户选择回避；应先降低对抗感。', better: COACH_TIPS.evasion.suggest },
  'evasion-2': { comment: '涉及风险事件时应说明目的是保护客户额度，而非追责。', better: '提这件事是为了帮贵司把担保部分的影响隔离开，避免审批时整体额度被打折。' },
  'emotion-1': { comment: '共情表达自然，有效缓和了客户情绪。', better: '在共情之后立即给一个具体的下一步动作，效果会更好。' },
  'emotion-2': { comment: '使用了"不行 / 规定"等否定式表述，直接引发客户负面情绪。', better: COACH_TIPS.emotion.suggest },
  'needs-1': { comment: '以客户经营话题切入、开放式提问，需求挖掘有效。', better: '可追问一句"汇率波动去年大概影响了多少利润"，把痛点量化。' },
  'supply-1': { comment: '把供应链方案与客户自身利益（账期延长）绑定，说服力强。', better: '补一句"确权不占用贵司授信额度"，提前化解顾虑。' },
  'close-1': { comment: '明确了时间、人员与形式，成交推进到位。', better: '再确认一次对方需要准备的材料，避免会谈空转。' },
  default: { comment: '这一句没有承接客户上一轮的话题，客户失去兴趣。', better: '先复述客户的关切点，再给出一个具体信息或提问。' },
};

const count = (t: string, re: RegExp) => (t.match(re) ?? []).length;
const cl = (v: number) => Math.round(Math.min(96, Math.max(30, v)));
const PRODUCT_TERMS = /LPR|保理|银承|承兑|锁汇|远期|授信|确权|派生|RAROC|账期|结算|贴现|付汇|信用证|归集|直联/g;

export function evaluate(turns: Turn[], demo = false): Report {
  const mine = turns.filter((t) => t.role === 'me');
  const all = mine.map((t) => t.text).join('\n');
  const red = mine.reduce((n, t) => n + (t.redLines?.length ?? 0), 0);
  const productHits = count(all, PRODUCT_TERMS);
  const distinctProducts = new Set(all.match(PRODUCT_TERMS) ?? []).size;
  const empathy = count(all, /理解|您的顾虑|感受|抱歉|确实|站在您|辛苦|不容易/g);
  const questions = count(all, /[？?]/g) + count(all, /想听听|怎么看|计划|规划|需求|痛点/g);
  const structure = count(all, /首先|其次|第一|第二|一方面|另一方面|因此|总结/g);
  const closing = count(all, /下一步|安排|拜访|约|方案|签|时间|当面/g);
  const polite = Math.min(20, count(all, /您/g) * 3) + Math.min(12, count(all, /感谢|请|麻烦/g) * 4) - count(all, /你们必须|随便|无所谓/g) * 10;
  let positive = 0, handled = 0, objections = 0;
  turns.forEach((t, i) => {
    if (t.role === 'me' && t.delta !== undefined && t.delta > 0) positive++;
    if (t.role === 'ai' && t.type && t.type !== 'none' && i > 0) {
      objections++;
      const next = turns[i + 1];
      if (next?.role === 'me' && (next.delta ?? 0) > 0) handled++;
    }
  });
  const avgLen = mine.length ? all.length / mine.length : 0;
  const n = Math.max(mine.length, 1);
  const computed = [
    cl(50 + Math.min(30, productHits * 5) - red * 3),
    cl(45 + Math.min(25, avgLen / 3) + structure * 6),
    cl(45 + Math.min(40, positive * 7)),
    cl(40 + Math.min(45, questions * 8)),
    cl(45 + (objections ? (handled / objections) * 40 : 0) + Math.min(10, objections * 2)),
    cl(45 + Math.min(45, distinctProducts * 6)),
    cl(92 - red * 18),
    cl(45 + Math.min(45, empathy * 8)),
    cl(40 + Math.min(50, closing * 9)),
    cl(60 + polite),
  ].map((v, i) => (mine.length < 2 && i !== 6 ? Math.min(v, 58) : v));
  const dimScores = demo ? DEMO_DIMS : computed;
  const dims = EVAL_DIMS.map((dim, i) => ({ dim, score: dimScores[i] }));
  const score = Math.round(dims.reduce((a, b) => a + b.score, 0) / dims.length);

  const STRENGTH: Record<string, string> = { 专业度: '产品术语扎实', 逻辑结构: '表达有条理', 说服力: '价值论证有力', 需求挖掘: '善用开放式提问', 异议处理: '异议转化有效', 产品匹配: '方案与需求贴合', 合规性: '表述合规稳健', 共情倾听: '共情表达自然', 成交推进: '下一步动作明确', 礼仪表达: '礼貌得体' };
  const IMPROVE: Record<string, string> = { 专业度: '数据与术语需更精准', 逻辑结构: '先结论后论据', 说服力: '用数字代替形容词', 需求挖掘: '先问再说·少讲多听', 异议处理: '先共情再回应', 产品匹配: '按痛点匹配产品', 合规性: '杜绝承诺性表述', 共情倾听: '复述客户关切', 成交推进: '每次会谈锁定下一步', 礼仪表达: '称谓与语气更稳' };
  const sorted = [...dims].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter((d) => d.score >= 64).slice(0, 5).map((d) => STRENGTH[d.dim]);
  while (strengths.length < 3) strengths.push(STRENGTH[sorted[strengths.length].dim]);
  const low = [...dims].sort((a, b) => a.score - b.score);
  const improves = low.filter((d) => d.score < 62).slice(0, 5).map((d) => IMPROVE[d.dim]);
  while (improves.length < 3) improves.push(IMPROVE[low[improves.length].dim]);
  const redLabels = Array.from(new Set(mine.flatMap((t) => t.redLines ?? [])));
  const compliance: Report['compliance'] = redLabels.length
    ? [...redLabels.map((l) => ({ label: `触发：${l}`, tone: 'red' as const })), { label: '需复训：合规话术', tone: 'red' as const }, { label: '未涉及利益输送', tone: 'green' as const }]
    : [{ label: '无违规表述', tone: 'green' }, { label: '未承诺审批结果', tone: 'green' }, { label: '未贬损同业', tone: 'green' }, { label: '客户信息未外泄', tone: 'green' }];

  const reviews: Review[] = mine.map((t) => {
    const rule = REVIEW_RULES[t.branchId ?? 'default'] ?? REVIEW_RULES.default;
    if (t.redLines?.length) {
      const rl = RED_LINES.filter((r) => t.redLines!.includes(r.label));
      return { original: t.text, comment: `合规红线：${t.redLines.join('、')}。${rl.map((r) => r.hint).join(' ')}`, better: '我们会全力推动审批，结果以授信审批部门意见为准；本行方案的价值我用数字来说明。', flag: 'red' };
    }
    return { original: t.text, comment: rule.comment, better: rule.better, flag: (t.delta ?? 0) > 0 ? 'green' : 'gold' };
  });
  return { score, dims, strengths, improves, compliance, reviews, history: [...HISTORY, { d: '本次', s: score }] };
}

/** 情绪值更新：分支基础变化 + 共情加分 + 红线扣分 + 过短扣分 */
export function nextMood(current: number, branch: Branch, input: string, redHits: number): number {
  let d = branch.moodDelta;
  if (branch.id !== 'emotion-1' && /理解|您的|感谢|抱歉|确实/.test(input)) d += 2;
  d -= Math.min(12, redHits * 8);
  if (input.replace(/\s/g, '').length < 10) d -= 2;
  return Math.min(95, Math.max(5, current + d));
}
export const moodLabel = (m: number) => (m < 35 ? '抵触' : m < 55 ? '观望' : m < 75 ? '松动' : '认可');
