import type { Story, ThemeId, EraId } from '../types';
import { eraForYear } from './themes';

// Compact story builder. Each entry: [id, zhTitle, enTitle, lng, lat, year, themes, emoji, descZh, descEn, image?]
type Entry = [
  string, string, string, number, number, number,
  ThemeId[], string, string, string, string?
];

function build(
  country: string,
  cultureZh: string,
  cultureEn: string,
  entries: Entry[]
): Story[] {
  return entries.map(([id, zh, en, lng, lat, year, themes, emoji, descZh, descEn, image]) => ({
    id,
    title: { zh, en },
    country,
    culture: { zh: cultureZh, en: cultureEn },
    era: eraForYear(year) as EraId,
    themes,
    year,
    emoji,
    lnglat: [lng, lat],
    image,
    description: { zh: descZh, en: descEn },
  }));
}

// ─── China · 华夏神话 ─────────────────────────────────────────────────────
const CN: Entry[] = [
  ['cn-pangu', '盘古开天', 'Pangu Creates the World', 113.3, 23.1, -10000, ['creation'], '🌌',
    '混沌如鸡卵，盘古生其中。一万八千岁后挥斧劈开，清气上升为天，浊气下沉为地。',
    'In primordial chaos shaped like an egg, Pangu cleaved sky from earth with his axe, then died so his body could become mountains, rivers and stars.'],
  ['cn-nuwa', '女娲补天', 'Nüwa Mends the Sky', 108.9, 34.3, -8000, ['creation', 'magic'], '🪡',
    '共工怒触不周山，天柱折，天倾西北。女娲炼五色石以补苍天，断鳌足以立四极。',
    'When the pillars of the sky shattered, the snake-bodied goddess fired five-colored stones to patch the heavens and cut a giant turtle\'s legs to prop the corners of the world.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Nuwa.jpg/640px-Nuwa.jpg'],
  ['cn-fuxi-nuwa', '伏羲女娲', 'Fuxi and Nüwa', 109.0, 34.0, -7000, ['creation', 'love'], '☯️',
    '兄妹二人蛇身人首，洪水后结为夫妇，繁衍人类。伏羲画八卦，女娲造笙簧。',
    'Brother-sister deities with serpent bodies who became husband and wife to repopulate the world; Fuxi drew the eight trigrams.'],
  ['cn-houyi', '后羿射日', 'Hou Yi Shoots the Suns', 116.4, 39.9, -2200, ['sun', 'hero'], '🏹',
    '尧时十日并出，禾稼焦枯。神射手后羿登山张乌号之弓，连射九日，独留一日普照人间。',
    'When ten suns scorched the earth, the divine archer Hou Yi shot nine of them down, leaving only one to warm humankind.'],
  ['cn-change', '嫦娥奔月', 'Chang\'e Flees to the Moon', 116.4, 39.9, -2200, ['moon', 'love'], '🌙',
    '后羿求得不死药，妻嫦娥独吞，身轻飞升广寒宫，唯有玉兔捣药相伴。',
    'After taking the elixir of immortality from her husband Hou Yi, Chang\'e drifted up to the moon, where only a jade rabbit keeps her company.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Chang_e_-_Project_Gutenberg_eText_15250.jpg/480px-Chang_e_-_Project_Gutenberg_eText_15250.jpg'],
  ['cn-niulang', '牛郎织女', 'The Cowherd and Weaver Girl', 113.6, 34.7, -500, ['love'], '🪡',
    '天河两岸，牛郎织女隔水相望，仅七夕之夜由喜鹊搭桥得一相会。',
    'Separated by the Milky Way, the mortal cowherd and the celestial weaver can only meet once a year on a bridge of magpies.'],
  ['cn-dayu', '大禹治水', 'Yu the Great Tames the Flood', 108.9, 34.3, -2100, ['flood', 'hero'], '🌊',
    '滔天洪水十三载，禹三过家门而不入，疏九河、凿龙门，终安天下。',
    'For thirteen years Yu dredged rivers and split mountains to drain the great deluge, never once entering his home as he passed.'],
  ['cn-jingwei', '精卫填海', 'Jingwei Fills the Sea', 119.7, 36.1, -2500, ['death', 'beast'], '🐦',
    '炎帝少女溺于东海，魂化精卫鸟，衔西山木石不止，誓填东海。',
    'Drowned in the East Sea, a young princess turned into a small bird and vows forever to fill the ocean with twigs and pebbles.'],
  ['cn-kuafu', '夸父逐日', 'Kuafu Chases the Sun', 110.3, 34.8, -2500, ['sun', 'death'], '☀️',
    '夸父与日竞走，渴饮河渭，水不足，欲北饮大泽，道渴而死，弃杖化为邓林。',
    'The giant Kuafu raced the sun until thirst killed him; his discarded staff sprouted into a forest of peach trees.'],
  ['cn-nezha', '哪吒闹海', 'Nezha Stirs the Sea', 121.5, 31.2, 1300, ['hero', 'magic'], '🔱',
    '李靖之子哪吒，七岁屠龙太子敖丙，闹翻东海龙宫，析骨还父，析肉还母，再生于莲花。',
    'The boy-warrior with fire wheels and a cosmic ring slew a sea-dragon prince, returned his flesh to his parents and was reborn from a lotus.'],
  ['cn-sunwukong', '美猴王孙悟空', 'Sun Wukong the Monkey King', 119.4, 25.4, 1590, ['trickster', 'magic'], '🐒',
    '花果山石卵迸出灵猴，学得七十二变与筋斗云，大闹天宫，后保唐僧西天取经。',
    'Born from a stone, the Monkey King mastered seventy-two transformations, ate the immortal peaches, and was finally tamed by a quest to the West.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Yoshitoshi_Songoku.jpg/480px-Yoshitoshi_Songoku.jpg'],
  ['cn-baisuzhen', '白蛇传', 'Legend of the White Snake', 120.2, 30.2, 1100, ['love', 'magic'], '🐍',
    '千年白蛇化身白素贞，与许仙杭州结缘；法海以雷峰塔镇之，断桥泣别千秋。',
    'A thousand-year-old white serpent took human form to love a young scholar by West Lake, until a monk sealed her under Leifeng Pagoda.'],
  ['cn-mengjiang', '孟姜女哭长城', 'Lady Meng Jiang Cries Down the Wall', 119.6, 39.9, -210, ['love', 'death'], '😭',
    '丈夫被征筑长城而死，孟姜女万里寻夫，痛哭三日三夜，城墙崩塌八百里。',
    'Searching for her husband forced to build the Great Wall, Meng Jiang wept until eight hundred li of stone crumbled to reveal his bones.'],
  ['cn-zhongkui', '钟馗捉鬼', 'Zhong Kui the Ghost-Catcher', 108.9, 34.3, 700, ['underworld', 'magic'], '🗡️',
    '貌丑落第书生钟馗，怒撞殿柱而亡。玉帝怜其才，封为鬼帝，率百鬼除魔卫家。',
    'A disgraced scholar who killed himself before the emperor became the heaven-appointed king of ghosts, marshaling demons against demons.'],
  ['cn-zhulong', '烛龙', 'Zhulong the Torch Dragon', 105.0, 45.0, -3000, ['dragon', 'creation'], '🐲',
    '钟山之神，人面蛇身，目即昼夜，息为风雨，吹之冬，呼之夏。',
    'A scarlet dragon with a human face whose opening eyes make day, closed eyes make night, and breath governs winter and summer.'],
  ['cn-bashian', '八仙过海', 'Eight Immortals Cross the Sea', 120.4, 37.5, 1100, ['hero', 'magic'], '🍑',
    '吕洞宾、铁拐李等八仙赴蟠桃会，各显神通过东海，留下"各显神通"之传。',
    'Eight Daoist immortals each crossed the East Sea using their unique magical tool, giving rise to a famous Chinese proverb.'],
  ['cn-liang-zhu', '梁山伯与祝英台', 'Butterfly Lovers', 121.6, 29.9, 350, ['love', 'death'], '🦋',
    '女扮男装的祝英台与梁山伯同窗三载；山伯死，英台投坟，化双蝶飞。',
    'A scholar-girl in disguise and her beloved studied together for three years; when love was forbidden, they died and rose as twin butterflies.'],
  ['cn-qilin', '麒麟', 'The Qilin', 116.4, 39.9, -500, ['beast'], '🦌',
    '麟有角不触，足不踏生草，唯圣王在位方现。孔子诞生之夜，麒麟吐玉书于阙里。',
    'A hooved chimera that crushes no living grass and appears only when a sage-king rules; one prophesied Confucius\'s birth.'],
];

// ─── Greece · 古希腊神话 ──────────────────────────────────────────────────
const GR: Entry[] = [
  ['gr-prometheus', '普罗米修斯盗火', 'Prometheus Brings Fire', 22.4, 39.0, -800, ['fire', 'hero'], '🔥',
    '泰坦普罗米修斯怜悯寒冷的人类，用茴香杆从奥林匹斯偷得火种，被宙斯锁在高加索山，恶鹰啄食其肝。',
    'The Titan stole fire from Olympus for shivering mortals and was chained to the Caucasus where an eagle devoured his liver every day.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Heinrich_f%C3%BCger_1817_prometheus_brings_fire_to_mankind.jpg/640px-Heinrich_f%C3%BCger_1817_prometheus_brings_fire_to_mankind.jpg'],
  ['gr-pandora', '潘多拉魔盒', 'Pandora\'s Box', 22.4, 39.0, -700, ['magic', 'creation'], '📦',
    '宙斯命赫淮斯托斯造首位女人潘多拉，赠盒一只。她启盒，瘟疫、悲伤、嫉妒散逸人间，唯希望留于盒底。',
    'Hephaestus shaped the first woman; given a sealed jar, she opened it and released every evil into the world — leaving only hope inside.'],
  ['gr-zeus-titans', '提坦之战', 'Titanomachy', 22.0, 38.5, -1000, ['war', 'creation'], '⚡',
    '宙斯率奥林匹斯诸神对抗其父克洛诺斯及众提坦，十年雷霆终将旧神打入塔尔塔罗斯深渊。',
    'For ten years Zeus and the Olympians battled the older Titans; the defeated were hurled into Tartarus, the deepest pit of the world.'],
  ['gr-athena', '雅典娜诞生', 'Birth of Athena', 23.7, 37.97, -800, ['war', 'hero'], '🦉',
    '宙斯吞下怀孕的智慧女神墨提斯。剧烈头痛迫他命赫淮斯托斯劈开头颅，全副武装的雅典娜跃出。',
    'When Zeus swallowed the goddess of cunning, the unborn Athena gave him such a headache that she sprang fully armed from his split skull.'],
  ['gr-apollo-daphne', '阿波罗与达芙妮', 'Apollo and Daphne', 22.5, 39.5, -700, ['love'], '🌿',
    '日神阿波罗追逐山林宁芙达芙妮，临被擒时，她呼求父神河神，化为月桂树。从此桂冠常戴诗人之首。',
    'Pursued by the sun-god, the nymph prayed to be saved; her father turned her into a laurel tree just as Apollo embraced her trunk.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Bernini_Apollo_und_Daphne.jpg/427px-Bernini_Apollo_und_Daphne.jpg'],
  ['gr-heracles', '海格力斯十二功绩', 'Twelve Labors of Heracles', 22.7, 37.6, -700, ['hero', 'beast'], '🦁',
    '半神英雄因疯狂误杀妻儿，受罚完成十二件不可能之任务：斩九头蛇、擒地狱犬、洁牛厩、取金苹果……',
    'To atone for killing his family in madness, the demigod completed twelve impossible tasks: slaying hydras, capturing Cerberus, cleaning stables in a day.'],
  ['gr-medusa', '美杜莎', 'Medusa', 25.4, 37.0, -700, ['magic', 'beast'], '🐍',
    '波塞冬辱雅典娜神庙中的少女，雅典娜怒，将其美发变蛇，凝视化人为石。珀尔修斯持镜斩之。',
    'Punished into a snake-haired monster whose gaze turned men to stone; Perseus beheaded her using a polished shield as a mirror.'],
  ['gr-minotaur', '迷宫与米诺陶', 'The Labyrinth and the Minotaur', 25.2, 35.3, -1400, ['beast', 'hero'], '🐂',
    '克里特国王米诺斯之妻产下牛首人身怪物，囚于代达罗斯所造迷宫。雅典英雄忒修斯持线团入内屠之。',
    'Trapped in Daedalus\'s labyrinth on Crete, the bull-headed monster fed on Athenian youths until Theseus followed a thread of yarn to slay it.'],
  ['gr-icarus', '伊卡洛斯坠海', 'The Fall of Icarus', 25.0, 36.0, -1400, ['death'], '🪶',
    '工匠代达罗斯为儿子造蜡羽双翼脱囚。少年伊卡洛斯醉于飞行，飞近太阳，蜡融羽落，坠入爱琴海。',
    'Wings of wax let father and son escape the labyrinth, but the boy flew too near the sun, the wax melted, and he plunged into the sea.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Pieter_Bruegel_de_Oude_-_De_val_van_Icarus.jpg/640px-Pieter_Bruegel_de_Oude_-_De_val_van_Icarus.jpg'],
  ['gr-odysseus', '奥德修斯归乡', 'The Odyssey', 20.7, 38.4, -1100, ['hero'], '⛵',
    '特洛伊战后，奥德修斯漂泊十年，骗过独眼巨人、塞壬之歌、女巫喀耳刻，终归伊萨卡，杀求婚者。',
    'After Troy, the wanderer spent ten years escaping Cyclops, sirens, and a sorceress before slaying the suitors squatting in his hall.'],
  ['gr-troy', '特洛伊木马', 'Trojan Horse', 26.2, 39.9, -1200, ['war'], '🐴',
    '希腊军围特洛伊十年不破，奥德修斯献计造巨木马，藏精兵于内，骗入城内，一夜屠之。',
    'After a decade of siege, the Greeks built a giant wooden horse, hid soldiers inside, and let it be wheeled into Troy as a "gift."'],
  ['gr-orpheus', '俄耳甫斯入冥府', 'Orpheus in the Underworld', 24.5, 41.4, -1000, ['underworld', 'love'], '🎵',
    '诗琴诗人俄耳甫斯为亡妻欧律狄刻下入冥府，琴声打动哈得斯获允带妻归阳；途中回首，妻永逝。',
    'The bard whose music charmed death itself led his dead wife from Hades — but turned back too soon, and lost her forever.'],
  ['gr-narcissus', '那耳喀索斯', 'Narcissus', 22.7, 38.4, -700, ['death', 'love'], '🌼',
    '美少年那耳喀索斯不爱任何人。诸神罚他爱上自己水中倒影，无法离去，憔悴而死，化为水仙。',
    'Punished by the gods to fall in love with his own reflection, the youth wasted away by the pool and was reborn as the flower that bears his name.'],
  ['gr-sisyphus', '西西弗斯', 'Sisyphus', 22.9, 37.9, -700, ['underworld'], '🪨',
    '科林斯王西西弗斯欺骗死神，被罚永远推巨石上山，临顶又滚落，循环无尽。',
    'Sentenced to roll a boulder uphill for eternity, only to watch it roll down again, the cunning king became the icon of futile labor.'],
  ['gr-persephone', '哈得斯与珀耳塞福涅', 'Hades and Persephone', 23.2, 37.5, -1000, ['underworld', 'love'], '🌸',
    '冥王劫掠丰收女神之女珀耳塞福涅入冥府。其母绝食令大地枯萎，遂定：少女每年半时返人间，半时居冥府，遂分四季。',
    'Stolen to the Underworld by Hades, the maiden returns to the surface for half each year — and her mother lets spring bloom in welcome.'],
  ['gr-aphrodite', '阿芙洛狄忒诞生', 'Birth of Aphrodite', 33.0, 34.8, -1200, ['love', 'creation'], '🐚',
    '克洛诺斯阉割其父乌拉诺斯，血溅大海泛白沫，浪花中升起美与爱之女神阿芙洛狄忒，浮贝抵塞浦路斯。',
    'When Cronos cast his father\'s severed flesh into the sea, the foam gave birth to the goddess of love, who drifted ashore on a scallop shell.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/640px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg'],
];

// ─── Egypt · 古埃及神话 ────────────────────────────────────────────────────
const EG: Entry[] = [
  ['eg-ra', '拉的日舟', 'The Solar Barque of Ra', 32.6, 25.7, -2500, ['sun', 'creation'], '☀️',
    '太阳神拉每日驾日舟越天穹，夜入冥界，斗大蛇阿佩普，晨从地平线重生。',
    'Each day Ra sails his solar boat across the sky and through the underworld, battling the serpent Apep before being reborn at dawn.'],
  ['eg-osiris', '奥西里斯之死', 'Death of Osiris', 30.7, 31.6, -2500, ['death', 'underworld'], '⚱️',
    '冥王奥西里斯被弟塞特杀害肢解，尸沉尼罗。其妻伊西斯寻回拼合，复活生子荷鲁斯，从此为冥界之王。',
    'Slain and scattered by his jealous brother Set, the king-god was reassembled by his wife Isis and rose as eternal lord of the dead.'],
  ['eg-isis', '伊西斯的魔法', 'Isis the Great Sorceress', 30.7, 31.6, -2500, ['magic', 'love'], '🪄',
    '伊西斯诱拉吐露真名而得万法之主。她以咒语复活丈夫，又化飞鸢于死者上方扇翼引生气。',
    'Tricking Ra into revealing his true name, the queen of magic learned every spell — and used them to resurrect her murdered husband.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Isis_Tomb_of_Seti_I_by_Belzoni.jpg/360px-Isis_Tomb_of_Seti_I_by_Belzoni.jpg'],
  ['eg-horus', '荷鲁斯之眼', 'The Eye of Horus', 32.9, 24.1, -2000, ['hero', 'magic'], '🦅',
    '荷鲁斯为父复仇与叔父塞特鏖战八十载，失左眼。后修复为荷鲁斯之眼，象征护佑、王权与新生。',
    'In an eighty-year war to avenge his father, the falcon-headed god lost his eye to Set; restored, it became Egypt\'s emblem of protection.'],
  ['eg-anubis', '阿努比斯称心', 'Anubis Weighs the Heart', 31.4, 30.0, -2400, ['death', 'underworld'], '⚖️',
    '亡灵入冥府，胡狼头阿努比斯以羽毛秤称死者之心；轻者通往芦苇之野，重者被阿米特吞噬。',
    'In the Hall of Judgment the jackal-headed god weighs each soul\'s heart against a feather of truth; the unworthy are devoured by the demon Ammit.'],
  ['eg-set', '塞特的沙暴', 'Set, Storm and Desert', 25.6, 26.8, -2500, ['war'], '🏜️',
    '红发塞特，沙漠、混乱与风暴之神，弑兄夺位，与侄子荷鲁斯八十年苦战，象征文明边缘之必要混乱。',
    'Red-haired god of desert and chaos, the murderer of Osiris fought an eighty-year war with Horus — embodying necessary disorder.'],
  ['eg-sobek', '索贝克', 'Sobek the Crocodile', 31.0, 26.0, -2500, ['beast', 'flood'], '🐊',
    '鳄首神索贝克，主尼罗之水与勇力。法老借其威猛，传统中他守护尼罗，亦保亡灵免兽噬。',
    'The crocodile god commanded the Nile\'s might; pharaohs invoked his ferocity and prayed he would protect the dead from beasts.'],
  ['eg-bastet', '巴斯特', 'Bastet the Cat Goddess', 31.5, 30.4, -2400, ['beast', 'magic'], '🐈',
    '猫首女神巴斯特，温柔时主家庭与生育，怒时化雌狮屠敌。家中养猫即受其庇护。',
    'The cat-headed goddess is gentle protector of home and motherhood — and lioness of war when provoked. Cats themselves were her living temples.'],
  ['eg-thoth', '托特之书', 'Thoth and the Book', 31.4, 27.0, -2500, ['magic', 'creation'], '📜',
    '朱鹭头智神托特，发明文字、历法与魔法。他着《亡灵书》之原稿，秘藏于地下，凡读之者通晓万物。',
    'The ibis-headed god of writing penned the original Book of the Dead and hid it underground, where any reader would know all things.'],
  ['eg-aten', '阿吞日轮', 'The Aten\'s Disk', 30.8, 27.6, -1350, ['sun', 'creation'], '🔆',
    '法老阿肯那顿独尊太阳之轮阿吞，废多神。日轮放射赐生光线，触每个生灵手中。',
    'Pharaoh Akhenaten outlawed all gods but the sun-disk; the Aten\'s rays end in tiny hands offering life to every living thing.'],
];

// ─── Mesopotamia · 两河文明 ───────────────────────────────────────────────
const ME: Entry[] = [
  ['me-flood-sumer', '苏美尔大洪水', 'The Sumerian Flood', 44.4, 33.3, -2900, ['flood', 'creation'], '🌊',
    '诸神决议毁灭人类。智慧神恩基暗告祭司王祖苏德拉造方舟。洪水七日七夜后，他成为唯一获永生的凡人。',
    'When the gods decreed mankind\'s doom, Enki secretly warned a king to build a boat; after seven days of flood he became the only mortal granted eternal life.'],
  ['me-gilgamesh', '吉尔伽美什史诗', 'Epic of Gilgamesh', 46.1, 31.3, -2100, ['hero', 'death'], '🛡️',
    '乌鲁克王吉尔伽美什与野人恩奇都结为挚友，斗天牛、伐杉树。挚友死后，他独行求永生，终空手而归。',
    'The world\'s first epic: a king and his wild friend slew monsters together; when death took the friend, the king\'s quest for immortality failed.'],
  ['me-inanna', '伊娜娜入冥界', 'Inanna\'s Descent', 46.1, 31.3, -2100, ['underworld', 'love'], '⭐',
    '爱与战之女神伊娜娜下入冥府姊厄列什基迦勒之国，过七门各脱一饰，赤身受死。后被恩基救回，但须以爱人杜牟兹代之。',
    'The goddess of love descended through seven gates of the underworld, surrendering an item at each, until her body hung on a hook — and bartered her lover\'s life for her return.'],
  ['me-marduk', '马尔杜克战提阿马特', 'Marduk vs Tiamat', 44.4, 33.3, -1800, ['war', 'creation'], '🐲',
    '少年神马尔杜克以网与风缚原初海怪提阿马特，劈其身为天与地，眼为底格里斯、幼发拉底之源。',
    'With net and storm-winds, the young god trapped the primordial sea-dragon, split her in two to make sky and earth, and made her eyes into the Tigris and Euphrates.'],
  ['me-enki', '恩基与水', 'Enki Lord of Sweet Waters', 47.7, 30.5, -2500, ['creation', 'magic'], '🌊',
    '智慧神恩基居于深渊阿普苏，主淡水与魔法。他造人于黏土，又总于诸神毁灭命令前暗中救人。',
    'God of fresh water and cunning, Enki shaped humans from clay and time and again secretly saved them when the other gods decreed their destruction.'],
  ['me-lamassu', '拉马苏', 'Lamassu the Guardians', 43.1, 36.3, -800, ['beast'], '🐂',
    '人首、牛身、雄鹰之翼，立于宫门两侧，守城与王。十英尺巨大石像，正面视如行走，侧面视似稳立。',
    'Human-faced winged bulls flanking palace gates; carved with five legs so they appear to stand still in profile and stride forward head-on.'],
];

// ─── India · 印度神话 ─────────────────────────────────────────────────────
const IN: Entry[] = [
  ['in-nataraja', '湿婆宇宙之舞', 'Nataraja, Lord of the Dance', 78.0, 11.4, -1000, ['creation', 'magic'], '🕉️',
    '湿婆于火焰光环中起舞，右手击鼓造世，左手持火毁世，足下踏无明之矮鬼。一舞间宇宙生灭无数。',
    'In a ring of flame Shiva dances creation into being with one hand and destruction with the other, treading on the dwarf of ignorance.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Shiva_as_the_Lord_of_Dance_LACMA_edit.jpg/427px-Shiva_as_the_Lord_of_Dance_LACMA_edit.jpg'],
  ['in-vishnu-avatars', '毗湿奴十化身', 'Ten Avatars of Vishnu', 81.6, 27.0, -800, ['hero', 'creation'], '🐠',
    '宇宙护持者毗湿奴每于劫数降世：鱼救摩奴、龟撑须弥、野猪、人狮、侏儒、持斧、罗摩、黑天、佛陀、迦尔吉。',
    'The preserver descends in ten forms to save the world: fish, turtle, boar, lion-man, dwarf, axe-wielder, Rama, Krishna, Buddha, and the future Kalki.'],
  ['in-ramayana', '罗摩衍那', 'The Ramayana', 81.0, 26.8, -500, ['hero', 'love'], '🏹',
    '太子罗摩流放十四载，妻悉多被楞伽王罗波那劫去。罗摩率猴军越海，连战罗刹，终救回爱妻。',
    'Exiled prince Rama crossed an ocean of monkeys to free his wife Sita from the ten-headed demon-king Ravana of Lanka.'],
  ['in-krishna-flute', '黑天的笛声', 'Krishna\'s Flute', 77.7, 27.5, -500, ['love'], '🎶',
    '少年黑天于温达文吹响七孔笛，月夜出走赴林，与牧女拉达共舞，宇宙皆为之停转。',
    'In Vrindavan, the blue god\'s flute summoned the milkmaids from their homes; with the gopi Radha he danced under the moon as time stood still.'],
  ['in-hanuman', '哈奴曼托山', 'Hanuman Carries the Mountain', 81.3, 26.0, -500, ['hero', 'magic'], '🐒',
    '猴神哈奴曼为救罗摩弟拉克什曼，纵身腾飞，整托一座药山而归，月被遮明。',
    'When the healing herb could not be found, the monkey god flew through the night, tore up the whole mountain, and carried it back over the moon.'],
  ['in-kali', '迦梨女神', 'Kali the Destroyer', 88.4, 22.6, -300, ['death', 'war'], '🩸',
    '黑面四臂迦梨，挂头骨为环，舌伸吻地。她诛恶魔而狂舞，舞至几毁宇宙，唯丈夫湿婆卧其足下方止。',
    'Garlanded with skulls, the four-armed black goddess danced so violently after slaying demons that only Shiva lying under her feet could stop her.'],
  ['in-durga', '难近母', 'Durga Slays the Buffalo Demon', 73.9, 18.5, -200, ['hero', 'war'], '🦁',
    '诸神共聚怒火造难近母，乘狮持十兵，与变形莫衷之水牛魔王摩希沙苏拉九夜厮杀，破其首级。',
    'Born from the assembled wrath of the gods, the warrior-goddess rode a lion and battled the buffalo-demon Mahishasura for nine nights before beheading him.'],
  ['in-yama', '阎摩冥神', 'Yama, Lord of Death', 79.0, 21.2, -500, ['death', 'underworld'], '🐃',
    '首位死者阎摩成冥府之王，乘黑水牛持索套，与文书奇特拉笈多记录万人善恶。',
    'The first man to die became the lord of the dead, riding a black buffalo and carrying a noose; his scribe records every soul\'s deeds.'],
  ['in-indra', '因陀罗劈弗栗多', 'Indra and Vritra', 77.1, 28.6, -1200, ['war', 'magic'], '⚡',
    '雷神因陀罗骑白象艾拉瓦塔，以金刚杵击碎吞水之蛇魔弗栗多，七大江水奔流复出。',
    'Mounted on his white elephant, the thunder-god split the water-hoarding serpent Vritra with his vajra, releasing the seven rivers of the world.'],
  ['in-agni', '阿耆尼火神', 'Agni Carrier of Offerings', 78.0, 23.0, -1500, ['fire'], '🔥',
    '七火舌、二面，立每一炉灶之中，将祭品自人间运抵诸神。无他，则祭祀皆失。',
    'Seven-tongued, two-faced, the fire god dwells in every hearth and carries offerings from humans to all other gods; without him no sacrifice works.'],
  ['in-lakshmi', '拉克什米', 'Lakshmi of Fortune', 73.9, 18.9, -500, ['love', 'magic'], '🪷',
    '搅乳海得之女神，立于盛开莲花上，四手赐财、子嗣、智慧与解脱。毗湿奴每化身，她皆相随。',
    'Goddess of fortune born from the churned sea of milk; standing on a lotus, she follows Vishnu through every incarnation as his loving wife.'],
  ['in-manu-flood', '摩奴方舟', 'Manu\'s Flood', 80.0, 30.0, -2000, ['flood', 'creation'], '🐟',
    '一日，摩奴洗手时一小鱼请求救助。鱼日渐巨长，告以大洪水将至。摩奴造舟，鱼角拖之过水，独人类延续。',
    'A tiny fish in his washing-water grew into a giant who warned Manu of the coming flood; tied to its horn, the boat carried the seed of all life.'],
  ['in-ganesha', '象头神迦尼萨', 'Ganesha the Elephant-Headed', 73.9, 18.5, -200, ['magic', 'hero'], '🐘',
    '雪山神女湿婆所造之子，被湿婆误斩首，复以一象首接之。胖腹、单牙、坐鼠，主智慧与启程之吉。',
    'Beheaded by his own father in misunderstanding, the child was revived with an elephant\'s head; the round-bellied god removes obstacles before any journey.'],
  ['in-sagara', '娑竭罗龙王', 'Sagara, the Naga King', 82.0, 22.0, -100, ['dragon'], '🐉',
    '九头蛇王娑竭罗居海底珍宫，与雨水之神同主。其女嫁须弥座下，化海为众生界。',
    'The nine-headed serpent-king dwells in a jewel palace beneath the sea and rules the rains; his daughter married the Bodhisattva of compassion.'],
];

// ─── Norse · 北欧神话 ─────────────────────────────────────────────────────
const NO: Entry[] = [
  ['no-odin', '奥丁悬世界树', 'Odin Hangs from Yggdrasil', -19.0, 64.1, 800, ['magic', 'creation'], '🌳',
    '奥丁以矛刺己悬于宇宙树尤克特拉希尔九昼夜，断食断水，自我献祭于自我，终获卢恩文之秘。',
    'For nine days the All-Father hung himself on the World Tree, stabbed by his own spear, sacrificing himself to himself to win the runes of magic.'],
  ['no-thor', '雷神托尔', 'Thor and Mjolnir', 10.7, 59.9, 900, ['war'], '⚡',
    '红须托尔挥短柄之锤妙尔尼尔，乘羊车出战巨人。锤掷出必返手中，雷声即其轨。',
    'Red-bearded Thor wielded the short-handled hammer Mjolnir; it always returned to his grip after striking, and its flight made the thunder.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg/480px-M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg'],
  ['no-loki', '洛基的诡计', 'Loki the Trickster', -19.0, 64.1, 900, ['trickster'], '🦊',
    '半神半巨人，常变形为母马、苍蝇、鲑鱼。他剪西芙金发、骗杀光明之神巴尔德，终被锁穴底，蛇毒滴面。',
    'Shape-shifter and oath-breaker, he cut off Sif\'s hair, contrived Baldur\'s death, and was finally chained beneath a serpent whose venom drips on his face.'],
  ['no-baldur', '巴尔德之死', 'Death of Baldur', 10.7, 59.9, 900, ['death'], '🌹',
    '光明之神巴尔德万物不伤，唯槲寄生未誓。洛基以槲枝授盲神霍德尔投掷，光明之神倒地，世入冬。',
    'Beloved god of light, Baldur was made invulnerable to all things — except the mistletoe Loki tricked his blind brother into throwing.'],
  ['no-ragnarok', '诸神黄昏', 'Ragnarok', -19.0, 64.1, 1000, ['war', 'creation'], '🔥',
    '海姆达尔吹号召诸神最后之战。奥丁葬狼口，托尔与尘世巨蟒同尽，宇宙焚于苏尔特尔之火，唯两人藏于树中存。',
    'When Heimdall blows his horn, gods and giants meet in final battle: Odin is swallowed by the wolf, Thor dies with the World Serpent, and the cosmos burns — yet a new world rises.'],
  ['no-jormungandr', '尘世巨蟒', 'Jormungandr the World Serpent', -19.0, 64.1, 900, ['dragon'], '🐍',
    '洛基之子，体绕米德加尔德海底环抱大地，咬住自尾。一日松口，必为末日。',
    'The child of Loki encircles the world beneath the sea, biting its own tail; the day its jaws part will be the end of all things.'],
  ['no-fenrir', '芬里尔狼', 'Fenrir the Great Wolf', -19.0, 64.1, 900, ['beast'], '🐺',
    '神锁不缚之巨狼，被骗以无形之绳格雷普尼缚，因咬下战神提尔之手。命中等待裂索，吞奥丁。',
    'No chain could hold the wolf-child; he was tricked into being bound by a ribbon woven from impossible things, biting off the war-god\'s hand.'],
  ['no-valkyries', '女武神', 'Valkyries', 18.1, 59.3, 900, ['war', 'death'], '🛡️',
    '骑天马披甲之女神，于战场拣选英魂归瓦尔哈拉。其马蹄之沫即北极光。',
    'Battle-maidens who ride between the clashing warriors, picking the bravest dead to feast in Valhalla; the northern lights are foam from their horses.'],
  ['no-ymir', '尤弥尔', 'Ymir the Frost Giant', -19.0, 64.1, -1000, ['creation'], '❄️',
    '混沌冰火相交生原初巨人尤弥尔。奥丁三兄弟杀之，以肉造土，骨为山，血为海，眉为人界藩篱。',
    'In the gap between ice and fire grew the first giant; Odin and his brothers slew him and made earth from his flesh, mountains from his bones, sea from his blood.'],
  ['no-freyja', '弗蕾亚的猫车', 'Freyja\'s Cat Chariot', 18.0, 59.3, 900, ['love', 'magic'], '😺',
    '爱与战之女神弗蕾亚，戴金项链布里希嘉曼，乘双猫拖车，泣金泪。她于战场上挑半数英魂归己。',
    'The love-and-war goddess wore the necklace Brísingamen, drove a chariot pulled by two cats, and wept tears of gold for lost lovers.'],
  ['no-yggdrasil', '世界之树', 'Yggdrasil the World Tree', -19.0, 64.1, 900, ['creation'], '🌲',
    '巨大白蜡树，三根入冥河、巨人国与诸神之井。九界悬于枝间，根下三命运女神织万物之命。',
    'A vast ash whose three roots reach to hell, giant-land, and the gods\' well; nine worlds hang in its branches and three Fates spin destiny beneath it.'],
  ['no-surtr', '苏尔特尔火巨人', 'Surtr the Fire Giant', -19.0, 64.1, 1000, ['fire'], '🗡️',
    '南方火国穆斯帕海姆之主，持燃烧之剑等待末日。诸神黄昏时，他将焚九界，一切归于灰烬。',
    'Lord of the burning land Muspelheim, he waits with a flaming sword to set all nine worlds on fire at the end of time.'],
];

// ─── Japan · 日本神话 ─────────────────────────────────────────────────────
const JP: Entry[] = [
  ['jp-amaterasu', '天照大神出岩窟', 'Amaterasu in the Cave', 135.8, 35.0, -660, ['sun', 'creation'], '☀️',
    '弟须佐之男暴行使天照大神怒入天岩户，世入黑暗。诸神奏乐起舞，悬八咫镜照其颜，引大神惊出，光复人间。',
    'Frightened by her brother\'s violence, the sun goddess hid in a cave plunging the world in dark; the other gods lured her out with mirror, jewels, and laughter.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Origin_of_Iwato_Kagura_Dance.jpg/640px-Origin_of_Iwato_Kagura_Dance.jpg'],
  ['jp-susanoo', '须佐之男斩八岐大蛇', 'Susanoo and Yamata no Orochi', 132.6, 35.5, -660, ['hero', 'dragon'], '🐉',
    '风神须佐之男于出云之地，以八樽烈酒诱八岐大蛇醉倒，斩八头八尾，自蛇尾得草薙剑。',
    'In Izumo the storm-god drugged the eight-headed serpent with eight vats of sake, beheaded it, and found the legendary sword Kusanagi in its tail.'],
  ['jp-tsukuyomi', '月读命', 'Tsukuyomi the Moon Lord', 135.8, 34.7, -660, ['moon'], '🌙',
    '太阳之妹月神，受姊命赴食神保食神之宴。彼以口吐食奉客，月读怒杀之。天照震怒，从此日月分明，永不相见。',
    'Sent by his sister to a feast, the moon-god killed the food goddess for serving meals from her mouth; furious Amaterasu split day and night forever.'],
  ['jp-momotaro', '桃太郎', 'Momotaro the Peach Boy', 134.0, 34.7, 1500, ['hero', 'beast'], '🍑',
    '河漂桃中迸出男婴。少年长成，携黍团子率犬、猿、雉同行，渡海征鬼之岛，载金银归。',
    'A boy born from a giant peach in a river took dog, monkey, and pheasant on a quest across the sea to defeat the demons of Onigashima.'],
  ['jp-urashima', '浦岛太郎', 'Urashima Taro', 135.5, 35.5, 800, ['magic', 'love'], '🐢',
    '渔人浦岛救乌龟，被引入海底龙宫，与公主乙姬共度三日。返岸时已三百年，启盒中烟一阵，化为白发翁。',
    'Saving a turtle led the fisherman to the Dragon Palace; "three days" with the princess turned out to be three centuries, and a forbidden box aged him in an instant.'],
  ['jp-tanabata', '七夕织姬', 'Tanabata: The Star Lovers', 135.5, 34.7, 800, ['love'], '🌠',
    '天上织女与牛郎隔银河相恋，玉皇罚一年仅七月七日得渡。雨夜不来，喜鹊不至，相思成河。',
    'A weaver star and a herder star love across the Milky Way; one night a year, on the seventh of the seventh, magpies bridge them — if it does not rain.'],
  ['jp-kappa', '河童', 'Kappa the River Imp', 137.0, 35.0, 1000, ['magic', 'beast'], '🟢',
    '绿皮龟壳，头顶碟盛水，盘中水尽则力散。喜食黄瓜，与孩童相扑，亦溺水拖人入河。',
    'Green river-imps with a water-filled dish on their head; bow politely so they spill it and lose their power, but never let them drag you under.'],
  ['jp-tengu', '天狗', 'Tengu the Mountain Spirit', 138.7, 35.4, 1100, ['magic'], '👺',
    '红面长鼻或鸦首长翅，居深山之中。傲慢武士死后多变为之，授剑术于山中修验僧。',
    'Long-nosed red goblins or crow-faced winged spirits dwelling on remote peaks; once-arrogant samurai become them in death and teach swordsmanship to ascetics.'],
  ['jp-yukionna', '雪女', 'Yuki-onna the Snow Woman', 142.0, 43.0, 1500, ['magic', 'love'], '❄️',
    '雪夜山中现绝色女子，吹气冻人。一樵夫被赦后娶遇雪夜之女，多年后泄秘，妻散为雪。',
    'In a blizzard a snow-pale woman freezes wanderers with her breath; one she spared became his wife, and dissolved into snow the day he broke his silence.'],
  ['jp-ryugu', '龙宫', 'Ryūgū-jō, the Dragon Palace', 130.3, 33.6, 800, ['dragon'], '🏯',
    '海底珊瑚为墙，珍珠为顶。龙王持潮汐之珠，其女乙姬于此宴客。鲷鱼比目鱼皆为侍。',
    'Coral walls and pearl roofs deep beneath the sea, where the Dragon King keeps the tide jewels and his daughter Otohime hosts mortal guests.'],
];

// ─── Korea · 韩国神话 ─────────────────────────────────────────────────────
const KR: Entry[] = [
  ['kr-dangun', '檀君神话', 'Dangun the Founder', 127.0, 38.3, -2333, ['creation', 'hero'], '🐻',
    '天帝之子桓雄降太白山。熊愿成人，食蒜与苦艾百日，化女子，配桓雄，生檀君，立古朝鲜。',
    'A bear that ate garlic and wormwood for 100 days became a woman; her son with the sky-prince founded Korea\'s first kingdom.'],
  ['kr-jumong', '朱蒙射阳', 'Jumong of Goguryeo', 125.7, 39.0, -50, ['hero'], '🏹',
    '河伯之女与天帝之子结合，生卵中之子朱蒙。少年箭术绝伦，南渡建高句丽。',
    'Born from a sun-touched egg, the wonder-archer fled south, parted rivers with his bow, and founded the kingdom of Goguryeo.'],
  ['kr-sim-cheong', '沈清传', 'Sim Cheong\'s Sacrifice', 126.9, 37.5, 1500, ['love', 'death'], '🪷',
    '盲父为复明，少女沈清自卖为水鬼之祭。投印唐津洋时，龙王怜其孝，藏莲心送返，遂为后妃。',
    'To restore her blind father\'s sight, the daughter sold herself to be drowned as a sacrifice; the Sea King hid her in a lotus and she rose as a queen.'],
  ['kr-rabbit-dragon', '兔王肝传', 'The Rabbit and the Dragon King', 127.0, 36.5, 1000, ['dragon', 'trickster'], '🐰',
    '龙王病重需兔肝。海龟诱兔下海。兔急中言肝晒在岸边，骗龟送返，纵身入林。',
    'Sick dragon-king needed a rabbit\'s liver; a turtle lured one to the sea floor, but the rabbit claimed his liver was drying on shore and escaped back to land.'],
];

// ─── Vietnam · 越南神话 ───────────────────────────────────────────────────
const VN: Entry[] = [
  ['vn-mountain-water', '山精水精', 'Mountain God vs Water God', 105.8, 21.0, -300, ['flood', 'war'], '⛰️',
    '雄王女儿媚娘可嫁山精或水精。山精先献礼。水精败，每年涨潮怒攻山精——即每年洪水之由。',
    'Two gods raced to marry a princess; the Mountain God won, and the Water God\'s annual revenge brings the floods to the Red River Delta each year.'],
  ['vn-lac-long-quan', '龙父仙母', 'Lac Long Quan and Au Co', 105.8, 21.0, -2879, ['creation', 'dragon'], '🐉',
    '海龙之父娶山仙之母，生百卵化百子。父率五十子下海，母带五十子上山，越南之祖。',
    'A sea-dragon prince married a mountain fairy; she laid a hundred eggs, and they parted — fifty children to the sea, fifty to the mountains.'],
  ['vn-saint-giong', '扶董天王', 'Thanh Giong, the Bamboo Hero', 105.8, 21.1, -1700, ['hero', 'war'], '🎋',
    '三岁不能言之子，闻外敌侵，索铁马、铁甲。一日疾长成巨人，骑铁马击退贼，归天而去。',
    'A silent child suddenly spoke to ask for iron horse and armor when invaders came, grew into a giant in a day, crushed the enemy, and rode his iron horse into the sky.'],
];

// ─── Italy · 罗马 + 意大利童话 ────────────────────────────────────────────
const IT: Entry[] = [
  ['it-romulus', '罗马起源', 'Romulus and Remus', 12.5, 41.9, -753, ['creation', 'hero'], '🐺',
    '战神玛尔斯之子兄弟被弃于台伯河，母狼哺养。罗慕路斯杀弟立罗马，七山之上城邦兴起。',
    'Abandoned twin sons of Mars, suckled by a she-wolf, the boys founded Rome; Romulus slew Remus over a boundary line.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/She-wolf_suckles_Romulus_and_Remus.jpg/640px-She-wolf_suckles_Romulus_and_Remus.jpg'],
  ['it-pinocchio', '匹诺曹', 'Le avventure di Pinocchio', 11.3, 43.8, 1881, ['magic', 'creation'], '🌲',
    '老木匠杰佩托用一段会说话的木头雕成男孩匹诺曹。木偶屡屡撒谎，鼻子越长，历经鲸鱼之腹后终得真童子身。',
    'A talking pinewood became a puppet whose nose grew with every lie; only after being swallowed by a giant fish did he earn a real boy\'s body.'],
  ['it-aeneas', '埃涅阿斯', 'Aeneas Flees Troy', 12.5, 41.9, -1200, ['hero', 'war'], '⚓',
    '特洛伊王子埃涅阿斯肩负老父、牵幼子，于火焰中逃出，渡海经迦太基至意大利，缔奠罗马之祖。',
    'Carrying his father out of burning Troy, the prince crossed the sea via Carthage to Italy — fathering the line that would found Rome.'],
  ['it-vestal', '维斯塔贞女与圣火', 'Vestal Virgins and the Sacred Fire', 12.5, 41.9, -700, ['fire'], '🕯️',
    '罗马城心炉中圣火不可熄。六名贞女终生守之三十年，若火灭或破贞，被活埋于战神之地。',
    'In Rome\'s heart burned a fire that must never go out; six maidens guarded it for thirty years — and were buried alive if it died or they did not.'],
  ['it-lupa', '卢帕狼母', 'Lupa the She-Wolf', 12.5, 41.9, -753, ['beast'], '🐺',
    '台伯河岸，罗马祖兄弟被弃，神圣狼母伸乳哺之。今卡比托利欧博物馆青铜像，传自伊特鲁里亚。',
    'On the banks of the Tiber she nursed the abandoned twins; her bronze image still guards the Capitoline Hill in Rome.'],
  ['it-dante', '但丁地狱', 'Dante\'s Inferno', 11.3, 43.8, 1320, ['underworld'], '📜',
    '但丁迷于人生半途黑暗之林，由维吉尔引领下至九层地狱：饕餮、淫欲、贪婪、暴怒、异端、暴力、欺诈、背叛。',
    'Lost in a dark wood at midlife, the poet descended through nine concentric circles of hell with Virgil — gluttons, lechers, traitors frozen at the core.'],
];

// ─── Germany · 德国童话 ───────────────────────────────────────────────────
const DE: Entry[] = [
  ['de-snowwhite', '白雪公主', 'Schneewittchen', 10.4, 51.2, 1812, ['princess', 'magic'], '🍎',
    '继后嫉妒白雪公主之美，命猎手杀之。猎手放生，公主入森林与七矮人同居。继后三计加害，毒苹果一咬而沉睡，王子之吻醒之。',
    'The queen\'s mirror said her stepdaughter was fairer; the girl fled to seven dwarfs, ate a poisoned apple, and slept until a prince came.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Theodor_Hosemann_Schneewitchen.jpg/480px-Theodor_Hosemann_Schneewitchen.jpg'],
  ['de-redriding', '小红帽', 'Rotkäppchen', 10.4, 51.2, 1812, ['beast', 'princess'], '🐺',
    '红帽女孩穿森林为外婆送饼。狼先一步吞外婆披衣装之，又吞女孩。樵夫破狼腹救出二人。',
    'A girl in a red hood crossed the forest to grandmother\'s; the wolf swallowed both, until a passing huntsman cut him open.'],
  ['de-cinderella', '灰姑娘', 'Aschenputtel', 10.4, 51.2, 1812, ['princess', 'magic'], '👠',
    '继母虐打灰姑娘。母亲坟上榛树成精，赐金衣银鞋。王子舞会三夜，仅水晶鞋合其足，遂迎为妃。',
    'Mistreated by stepmother and stepsisters, the cinder-girl received gowns from a hazel-tree on her mother\'s grave and danced three nights with the prince.'],
  ['de-rapunzel', '长发公主', 'Rapunzel', 10.4, 51.2, 1812, ['princess', 'love'], '💇',
    '巫婆囚少女于无门高塔，唯垂金发可攀。王子借发上塔。事泄，巫婆剪发流放公主，刺瞎王子，多年后双目复明于爱泪中。',
    'Locked in a doorless tower, the long-haired maiden let down her hair for the prince to climb; the witch banished her, blinded him — until her tears restored his sight.'],
  ['de-rhine', '罗蕾莱', 'Lorelei of the Rhine', 7.7, 50.1, 1800, ['love', 'death'], '🪨',
    '莱茵河之巨岩上，金发美人歌声夺魂。船夫望之，触礁覆舟，魂沉碧波。',
    'On a Rhine cliff a golden-haired maiden combs her hair and sings; sailors look up, smash on the rocks, and the river takes them.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Loreley_-_Bromsen.jpg/480px-Loreley_-_Bromsen.jpg'],
  ['de-pied-piper', '哈梅林吹笛人', 'Pied Piper of Hamelin', 9.4, 52.1, 1284, ['magic'], '🎵',
    '哈梅林鼠灾，五彩衣陌生吹笛人引鼠投河。市民赖账，他再吹笛带走城中百二十孩童，永不归。',
    'The town refused to pay him for ridding it of rats; so the pied man\'s second tune led every child of Hamelin away into the hills — never seen again.'],
  ['de-nibelung', '尼伯龙根之歌', 'Nibelungenlied', 12.4, 51.3, 1200, ['hero', 'war'], '⚔️',
    '齐格弗里德浴龙血而无敌，唯背一菩提叶印处可伤。他得尼伯龙之宝，娶克里姆希尔德，终被哈根背后一矛所刺。',
    'Siegfried bathed in dragon\'s blood and became invulnerable except where a leaf fell on his back — exactly where Hagen\'s spear later struck.'],
];

// ─── UK · 不列颠 ─────────────────────────────────────────────────────────
const GB: Entry[] = [
  ['gb-arthur', '亚瑟王拔石中剑', 'Arthur and the Sword in the Stone', -2.0, 51.0, 500, ['hero', 'magic'], '🗡️',
    '少年亚瑟于石中拔出王者之剑，加冕不列颠王。后聚圆桌十二骑士，败撒克逊侵略，建卡梅洛特。',
    'Only the true king could draw the sword from the stone; the boy Arthur did, and gathered twelve knights at a round table in Camelot.'],
  ['gb-merlin', '梅林', 'Merlin the Wizard', -3.6, 52.1, 500, ['magic'], '🪄',
    '德鲁伊之裔，无父半魔之子。预言亚瑟之诞与死，造圆桌、迁巨石阵于英伦，终困湖中仙女之穴永眠。',
    'Half-demon prophet who foretold Arthur\'s birth, raised Stonehenge from Ireland, and was finally sealed forever in a hawthorn by the Lady of the Lake.'],
  ['gb-grail', '圣杯', 'The Holy Grail', -2.7, 51.1, 1200, ['magic', 'hero'], '🍷',
    '基督最后晚餐之杯，由约瑟带至不列颠。亚瑟之骑士四方寻觅。唯加拉哈德至纯无瑕者得见之，得见即升天。',
    'The cup from the Last Supper, hidden in Britain; Arthur\'s knights sought it for years, and only the pure-hearted Galahad was allowed to see it.'],
  ['gb-robin-hood', '罗宾汉', 'Robin Hood', -1.2, 53.2, 1190, ['hero'], '🏹',
    '舍伍德林中绿衣神射手，劫富济贫，与小约翰、塔克修士同行，抗英主王约翰之恶吏。',
    'In Sherwood Forest the green-clad outlaw with his band robbed the rich to feed the poor and defied the corrupt sheriff of Nottingham.'],
  ['gb-beowulf', '贝奥武夫', 'Beowulf vs Grendel', -1.5, 52.5, 700, ['hero', 'beast'], '🛡️',
    '老英雄贝奥武夫渡海杀人食魔格伦德尔，再潜湖底斩其母。垂暮再战巨龙，同归于尽。',
    'The geat hero crossed the sea to tear off the monster Grendel\'s arm, dove a black lake to slay Grendel\'s mother, and died slaying a dragon in old age.'],
  ['gb-blackshuck', '黑狗', 'Black Shuck', 1.3, 52.6, 1500, ['death', 'beast'], '🐕‍🦺',
    '东英吉利沼地夜间出没之巨黑犬，独眼、红目，见之者一年内必死。1577年一只闯入教堂留爪痕。',
    'A huge spectral hound of the East Anglian fens; a glimpse of his red eye foretells a death within the year, and one left scorched claw-marks in a Suffolk church in 1577.'],
];

// ─── Ireland · 凯尔特 ─────────────────────────────────────────────────────
const IE: Entry[] = [
  ['ie-cuchulainn', '库丘林', 'Cuchulainn the Hound', -6.3, 53.3, 100, ['hero', 'war'], '🐕',
    '七岁屠犬而代之守门，少年单挑全康诺特军，怒时身扭如旋风，临终自缚石上死立。',
    'At seven he killed a guard-hound and took its place; in war his body twisted in battle-frenzy, and dying he tied himself to a standing-stone so he\'d die on his feet.'],
  ['ie-morrigan', '摩瑞甘', 'The Morrigan', -7.7, 53.4, 100, ['war', 'death'], '🐦‍⬛',
    '战之三相女神：少女、母亲、老妪；常化乌鸦盘旋战场之上，落于将死者肩头。',
    'The phantom queen of war and fate appears as three women or three crows; she lands on the shoulder of the man about to die.'],
  ['ie-sidhe', '土塚仙人', 'Sidhe of the Mounds', -7.7, 53.4, 500, ['magic'], '🍀',
    '远古图哈达南神族战败后退入土塚之下，化作仙人。万圣前夜，土塚之门开，凡人勿近。',
    'When the Tuatha Dé Danann lost to mortal invaders they retreated under the green mounds; on Samhain the doors open and the fairies ride.'],
  ['ie-banshee', '班西', 'The Banshee', -8.5, 51.9, 1000, ['death'], '😢',
    '披白发或灰袍的女鬼，于古老氏族之家旁夜泣；闻其哀号者，家中必有人将逝。',
    'A pale wailing woman appears beside the houses of certain old families; to hear her cry is to know a death is coming to that house.'],
];

// ─── Russia / Slavic · 斯拉夫 ─────────────────────────────────────────────
const RU: Entry[] = [
  ['ru-baba-yaga', '芭芭雅嘎', 'Baba Yaga', 37.6, 55.7, 1200, ['magic'], '🧙',
    '森林深处的老女巫，住于鸡腿木屋，乘臼以杵驱之，扫帚扫尽脚印。或助英雄，或食童子。',
    'In the forest stands a hut on chicken legs; the iron-toothed crone flies in a mortar and may eat or aid the wanderer at her door.'],
  ['ru-firebird', '火鸟', 'The Firebird', 37.6, 55.7, 1500, ['magic', 'fire'], '🔥',
    '羽如熔金的不死之鸟，飞之处地有光。沙皇命子取之，皇子追火鸟过山海，得金苹果，归而易位。',
    'A bird with feathers of molten gold whose feather lights a room; princes pursued her across the world for the tsar\'s golden apples.'],
  ['ru-rusalka', '鲁萨尔卡', 'Rusalka', 30.5, 50.5, 1500, ['love', 'death'], '🧜',
    '水中绿发少女，溺死之未婚少女所化。仲夏夜出水曼舞，诱猎人入河，缚而溺之。',
    'Green-haired water-maidens, the souls of girls who drowned betrayed; in midsummer they leave the river to dance, and pull young men beneath.'],
  ['ru-koschei', '不死的科谢', 'Koschei the Deathless', 37.6, 55.7, 1500, ['death', 'magic'], '💀',
    '黑骑无肉之巫王，灵魂藏于针中、针在卵中、卵在鸭中、鸭在兔中、兔在铁箱在橡树之上。',
    'The bony sorcerer\'s death lies in a needle, in an egg, in a duck, in a hare, in an iron chest, on top of an oak — find them all to slay him.'],
  ['ru-snegurochka', '雪姑娘', 'Snegurochka the Snow Maiden', 37.6, 55.7, 1800, ['love', 'death'], '❄️',
    '老夫老妻塑雪人之女，雪化得活。她爱牧人，跃过夏火欲为常人，融为薄雾消散。',
    'An old couple\'s snow-girl daughter came to life; falling in love she leapt the midsummer fire to become human and dissolved into mist.'],
  ['ru-vodyanoy', '弗多扬诺伊', 'Vodyanoy the River Lord', 30.5, 50.5, 1500, ['flood', 'beast'], '🌊',
    '青胡老人住池底，乘鲶鱼，缚溺者为奴。磨坊主须献马安抚。',
    'A pot-bellied green-bearded old man dwells in pools and millponds, riding catfish; millers had to throw in a horse to keep him quiet.'],
];

// ─── France · 法国 ───────────────────────────────────────────────────────
const FR: Entry[] = [
  ['fr-beauty-beast', '美女与野兽', 'La Belle et la Bête', 2.4, 47.0, 1740, ['love', 'beast'], '🌹',
    '父亲为美女摘玫瑰，被野兽囚。美女自愿换之。日久相处，破除诅咒，野兽复为王子。',
    'A girl took her father\'s place as captive of a beast in an enchanted castle; her growing love broke the curse and revealed a prince.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Beauty_and_the_Beast_-_Walter_Crane.jpg/640px-Beauty_and_the_Beast_-_Walter_Crane.jpg'],
  ['fr-bluebeard', '蓝胡子', 'Bluebeard', 2.4, 47.0, 1697, ['death'], '🔑',
    '富翁蓝胡子娶妻六房皆消失。新娶妻趁夫外出开禁室，见六尸悬钩。归者夺锁不能脱血，几被杀，兄弟驰援。',
    'The rich man with the blue beard forbade his bride one room; the bloody key revealed the corpses of his six former wives.'],
  ['fr-roland', '罗兰之歌', 'La Chanson de Roland', 1.4, 43.3, 778, ['hero', 'war'], '📯',
    '查理曼大帝甥罗兰殿后于龙塞斯瓦耶斯山口，遭萨拉森伏击，吹角求援，号断脑裂而死，杜兰达尔剑被掷入石。',
    'In the Roncesvalles pass Charlemagne\'s nephew rang his oliphant until his temple burst; before dying he hurled his sword Durendal into the rock.'],
];

// ─── Spain · 西班牙 ───────────────────────────────────────────────────────
const ES: Entry[] = [
  ['es-cid', '熙德', 'El Cid Campeador', -3.7, 40.4, 1099, ['hero', 'war'], '🛡️',
    '卡斯蒂利亚骑士罗德里戈被王放逐。他率部攻占瓦伦西亚，死后部下以其尸披甲乘马出战，敌兵以为他复生而溃逃。',
    'Exiled by his king, the knight took Valencia by his own arms; after his death his men strapped his corpse on his horse and Moors fled at the sight.'],
  ['es-santiago', '圣地亚哥屠摩尔', 'Santiago Matamoros', -7.5, 42.9, 844, ['hero', 'war'], '🐎',
    '使徒雅各骑白马从天而降助西班牙基督军于克拉维霍战役，剑指四方，斩摩尔人无数。',
    'At the Battle of Clavijo the apostle James descended on a white horse to slay countless Moors — patron of the Reconquista.'],
];

// ─── Arabia · 阿拉伯 ──────────────────────────────────────────────────────
const SA: Entry[] = [
  ['sa-aladdin', '阿拉丁神灯', 'Aladdin and the Magic Lamp', 39.8, 21.4, 1300, ['magic'], '🪔',
    '巴格达穷少年阿拉丁被巫师骗入地穴取灯，得灯中精灵之主。三愿娶公主、立宫殿，又险被巫师骗走。',
    'A poor boy in old Baghdad tricked into a magic cave; from a tarnished lamp came a jinn who built him a palace and won him a princess.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Aladdin01.jpg/360px-Aladdin01.jpg'],
  ['sa-sinbad', '辛巴达七航海', 'Sinbad the Sailor', 50.6, 26.2, 1200, ['hero'], '⛵',
    '巴士拉商人辛巴达七次出海：遇巨鲸如岛、独眼食人巨、海老人骑肩、钻石之谷、磁山覆船。',
    'Seven voyages from Basra — landing on a whale, riding the Old Man of the Sea, blinded a one-eyed giant, harvested diamonds with carrion meat.'],
  ['sa-ali-baba', '阿里巴巴四十大盗', 'Ali Baba and the Forty Thieves', 44.4, 33.3, 1300, ['hero', 'magic'], '🪨',
    '樵夫偶闻盗贼咒语"芝麻开门"，得藏珍。其妻摩珍娜以热油烹瓮中四十大盗，保家无虞。',
    'A woodcutter learned the password "Open Sesame" that split a rock; his slave-girl Morgiana boiled the forty robbers in their oil jars.'],
  ['sa-scheherazade', '山鲁佐德', 'Scheherazade', 44.4, 33.3, 800, ['love', 'magic'], '📚',
    '为救国中少女，宰相之女山鲁佐德嫁于杀妻之苏丹。每夜讲故事至天明而止，留悬念以续命。一千零一夜后，王回心。',
    'To stop her king\'s nightly murder of his brides, the vizier\'s daughter began a tale each night and broke it at dawn — for a thousand and one nights.'],
  ['sa-roc', '鲁克巨鸟', 'The Roc', 50.0, 25.0, 1200, ['beast'], '🦅',
    '印度洋上巨鸟，翼蔽天。爪攫巨象如鼠。辛巴达曾系于其爪逃出钻石谷。',
    'A bird so vast its wings darkened the sky over the Indian Ocean; it could lift an elephant in its talons — Sinbad once tied himself to one\'s leg.'],
  ['sa-djinn', '吉恩精灵', 'The Djinn', 44.4, 33.3, 700, ['magic'], '🌪️',
    '神火所造、烟与无形之灵。可善可恶。能化巨形或缩身入瓶，受所罗门金印封印。',
    'Born of smokeless fire before Adam, these spirits can be saintly or wicked, vast as towers or trapped in lamps by Solomon\'s seal.'],
  ['sa-magic-carpet', '飞毯', 'The Flying Carpet', 44.4, 33.3, 1300, ['magic'], '🪟',
    '所罗门王受神所赐绿丝毯，长六十迈里，载王及军，乘风出行。后传予一千零一夜诸王子。',
    'King Solomon\'s green silk carpet, miles wide, carried him with his army on the wind; later the Arabian Nights heroes inherited it.'],
];

// ─── Iran · 波斯 ──────────────────────────────────────────────────────────
const IR: Entry[] = [
  ['ir-rostam', '鲁斯塔姆', 'Rostam the Hero', 51.4, 35.7, -200, ['hero', 'beast'], '🦁',
    '《列王纪》中波斯之大英雄，骑神驹拉赫什，七战胜白魔、巨狮、女妖；终被异母兄陷阱坠井。',
    'The greatest Persian hero rode the immortal horse Rakhsh through seven labors — slaying a white demon, a dragon, a witch — until betrayed into a pit.'],
  ['ir-simurgh', '西摩夫', 'Simurgh', 50.5, 35.7, -500, ['beast', 'magic'], '🦚',
    '神山之巅的孔雀色大鸟，知一切语言，治百伤。曾抚育鲁斯塔姆之父扎尔，授飞羽召之。',
    'A peacock-feathered bird atop the world-mountain who knows every tongue and heals every wound; she fostered Rostam\'s father Zal in her nest.'],
  ['ir-jamshid', '贾姆希德的金杯', 'Jamshid and the Cup', 52.5, 29.6, -3000, ['hero', 'magic'], '🍷',
    '波斯王贾姆希德持七环金杯Jam-e Jam，杯中映现宇宙万事。亦传他造车马、织布、辨珠玉之祖。',
    'The Persian king held a seven-ringed golden cup that showed all the universe within; he taught humanity weaving, healing, and gem-craft.'],
];

// ─── Turkey · 突厥 ────────────────────────────────────────────────────────
const TR: Entry[] = [
  ['tr-asena', '苍狼阿史那', 'Asena the Grey She-Wolf', 35.0, 39.0, -500, ['beast', 'creation'], '🐺',
    '突厥部落几灭，唯一伤童被苍灰母狼救于山洞，与其结合生十子。其后裔即突厥之祖。',
    'When a tribe was nearly wiped out, a grey she-wolf sheltered the only wounded boy in a cave; their ten sons became the founding clans of the Turks.'],
];

// ─── Mexico · 阿兹特克 + 玛雅 ─────────────────────────────────────────────
const MX: Entry[] = [
  ['mx-quetzalcoatl', '羽蛇神', 'Quetzalcoatl', -98.8, 19.7, 900, ['dragon', 'creation'], '🐍',
    '托尔特克之白皮羽蛇神，下入冥府收骨，洒血其上造人。文明、玉米与历法之主，曾被骗醉酒，乘蛇舟泛海东去。',
    'The feathered serpent of Toltec and Aztec myth descended into the underworld for the bones of the dead and bled on them to make mankind.'],
  ['mx-five-suns', '五太阳传', 'The Five Suns', -99.1, 19.4, 1300, ['sun', 'creation'], '🌞',
    '诸神四度造日，皆遭风暴、火、洪水、虎口之灾。第五日为弱小神纳纳瓦特辛跃入火中重生，即此世之日。',
    'Four worlds and four suns were destroyed by wind, fire, flood, and jaguars; the fifth, our sun, began when a humble god leapt into a bonfire.'],
  ['mx-mictlan', '米克特兰', 'Mictlantecuhtli', -99.1, 19.4, 1300, ['underworld', 'death'], '💀',
    '骷髅之神镇九层冥府米克特兰，亡灵历四载寒风、刀山、河海之苦，化为粉尘永歇于第九层。',
    'The skeletal lord of nine-tiered Mictlán; souls walked four years through wind, knives, rivers before becoming dust in the final layer.'],
  ['mx-tlaloc', '特拉洛克', 'Tlaloc the Rain God', -99.1, 19.4, 1300, ['flood'], '💧',
    '蓝面戴齿之雨神居于山巅。落雷石球四向洒水。儿童之泪为其所喜，故古以童为牺牲。',
    'Goggle-eyed god of rain dwells atop sacred mountains; he prizes the tears of children, and Aztec priests sacrificed weeping infants to him.'],
  ['mx-popol-vuh', '波波尔·乌', 'Popol Vuh: The Hero Twins', -90.5, 15.5, -400, ['hero', 'underworld'], '⚱️',
    '玛雅双子英雄洪那普与希巴兰克下冥府西巴尔巴，戏弄死神，过寒、刀、虎之屋，终败地狱诸主，升为日月。',
    'In the Mayan creation epic, the hero twins descended into Xibalba, outwitted the death lords through houses of bats, knives, and jaguars, and rose as sun and moon.'],
  ['mx-llorona', '哭泣女', 'La Llorona', -99.1, 19.4, 1500, ['death', 'love'], '😭',
    '河岸边夜泣之白衣长发女鬼，因负夫嫁富人，溺自亲子。今夜闻其哭，孩童勿近河。',
    'A weeping woman in white wanders rivers at night; she drowned her children for a faithless lover and now snatches careless ones in their place.'],
];

// ─── Peru · 印加 ──────────────────────────────────────────────────────────
const PE: Entry[] = [
  ['pe-inti', '印蒂日神', 'Inti the Sun', -72.5, -13.5, 1200, ['sun', 'creation'], '🌅',
    '印加帝国之主神，金面日轮神。其子曼科·卡帕克与妹妻立于的的喀喀湖畔，建立库斯科。',
    'The Inca sun god\'s golden face shone over the empire; his son Manco Capac rose from Lake Titicaca with his sister-wife to found Cuzco.'],
  ['pe-viracocha', '维拉科查', 'Viracocha the Creator', -72.0, -13.5, 1000, ['creation'], '🌋',
    '从的的喀喀湖中升起，以泥造人，吹气赋灵，遣巨人巡天下校风教化，最后步水东行去。',
    'Rising from Lake Titicaca, the creator shaped people from clay, breathed life into them, and walked across the Pacific into the sunrise.'],
  ['pe-pachamama', '帕查玛玛', 'Pachamama Earth Mother', -71.5, -13.5, 1200, ['creation'], '🌾',
    '安第斯之大地母神，孕万物者。每年八月田头献古柯叶、酒与彩绳，求其慷慨。',
    'Mother Earth of the Andes nurtures crops and animals; every August farmers leave coca, chicha and ribbons in field corners to thank her.'],
];

// ─── Brazil · 巴西 ────────────────────────────────────────────────────────
const BR: Entry[] = [
  ['br-curupira', '库鲁皮拉', 'Curupira the Forest Guardian', -60.0, -3.5, 1500, ['magic', 'beast'], '🌳',
    '红发反足之矮人，森林之守护。狩猎过度者被反向脚印诱入林深迷失，鬼魅般笑声四方回响。',
    'A red-haired imp with backwards feet guards the Amazon; hunters who take too much follow his reversed tracks and never find their way out.'],
  ['br-saci', '萨西', 'Saci Pererê', -47.9, -15.8, 1700, ['trickster'], '🌀',
    '独腿红帽黑童子，吹哨乘旋风。喜捣乱：缠马尾、酸牛奶、藏针线、躲烟斗。烟囱中口可缚之。',
    'A one-legged black boy in a red cap rides whirlwinds; he tangles horses\' tails, sours milk, hides scissors — caught only by trapping him in a bottle.'],
  ['br-boitata', '博伊塔塔', 'Boitatá the Fire Serpent', -47.0, -15.0, 1500, ['dragon', 'fire'], '🐍',
    '巨眼火蛇，浴大洪水后吸食日久暗光，遂体放火光。雷雨之夜飞过田野，焚烧伐林者。',
    'A giant-eyed serpent of fire who survived the great flood by feeding on the eyes of the dead; she flies above the savanna at night burning anyone who burns the forest.'],
];

// ─── Nigeria · 约鲁巴 ────────────────────────────────────────────────────
const NG: Entry[] = [
  ['ng-olorun', '奥洛伦', 'Olorun the Sky Father', 7.5, 7.5, 800, ['creation'], '☁️',
    '约鲁巴至上神，居天之顶。命次子奥巴塔拉以泥造人，奥巴塔拉醉酒，造畸形，奥洛伦补气赋灵。',
    'The Yoruba sky father sent his son Obatala down to mold humans from clay; the son drank too much palm wine and made cripples — but Olorun gave them life anyway.'],
  ['ng-ogun', '奥贡', 'Ogun the Iron God', 7.5, 7.5, 1000, ['war', 'fire'], '⚒️',
    '铁、火、战争与道路之神。第一神斫山辟路，引诸神下界。今铁路司机、铁匠、士兵皆敬之。',
    'God of iron, fire, and roads; he was the first to clear a path down from heaven with his machete, and is invoked by every blacksmith and soldier.'],
  ['ng-shango', '香戈', 'Shango the Thunderer', 4.5, 8.0, 1400, ['war', 'magic'], '⚡',
    '约鲁巴雷神，双斧之主。生为奥约第三王，自缢成神，落雷击不敬者之屋。其妻三人皆为河神。',
    'The third king of Oyo became the god of thunder; with his double-axe he hurls lightning at his enemies\' houses and is invoked in Yoruba diaspora worldwide.'],
  ['ng-oshun', '奥順', 'Oshun the River Goddess', 4.5, 7.5, 1000, ['love'], '🏞️',
    '黄铜珠饰、扇舞之爱与河流女神。当其余诸神都不为之顾时，唯她以蜜引地母重启地之生育。',
    'Goddess of fresh water, love, and beauty; when the male gods failed to bring fertility back to earth, only her sweet honey-coaxing succeeded.'],
];

// ─── Australia · 原住民 ──────────────────────────────────────────────────
const AU: Entry[] = [
  ['au-rainbow', '彩虹蛇', 'Rainbow Serpent', 134.5, -25.0, -40000, ['creation', 'dragon'], '🌈',
    '梦时代之巨蛇蜿蜒大地，凿出江河，雨季后浮于天际为彩虹。怒时引洪水覆地。',
    'The greatest of Dreamtime beings carved the rivers as she travelled and rises into the sky as the rainbow after the rains; angered, she floods the land.'],
  ['au-dreamtime', '梦时代', 'The Dreaming', 134.5, -25.0, -50000, ['creation'], '🌀',
    '原住民认万物皆由"梦时代"之祖灵走过大地时所造：每山每谷皆有歌路，唱之即知行。',
    'Aboriginal cosmology: ancestral beings walked the land in the Dreamtime, singing each rock and river into existence; songlines map the continent in chant.'],
  ['au-baiame', '巴亚梅', 'Baiame the Sky Father', 134.5, -25.0, -10000, ['creation'], '🦅',
    '澳东南族之天父神，梦时代之初下凡塑山河草木，与妻巴拉哥共立法律，留巨足印于巨石。',
    'The Sky Father of southeast Australian peoples came down at the start of Dreamtime, shaped the land with his wife, and his giant footprints remain on certain rocks.'],
  ['au-bunyip', '班宁', 'Bunyip', 145.0, -37.0, 1800, ['beast'], '🦛',
    '住沼泽与水洞之半河马半海狗水怪，夜吼如雷，专食女童夜归者，沼边湿迹即其行踪。',
    'A water beast lurking in billabongs and swamps, bellowing in the dark; its damp tracks at the water\'s edge mean a child has been taken in the night.'],
];

// ─── New Zealand · 毛利 ─────────────────────────────────────────────────
const NZ: Entry[] = [
  ['nz-maui-fish', '毛伊钓岛', 'Maui Fishes Up the Islands', 173.0, -41.0, -1000, ['creation', 'hero'], '🎣',
    '少年毛伊以祖母颚骨为钩，钓起太平洋海底大鱼，化为新西兰北岛。今鱼脊纹路即峰岭。',
    'With his grandmother\'s jawbone as a hook, the trickster hero pulled up a great fish from the Pacific floor — its body became the North Island of New Zealand.'],
  ['nz-rangi-papa', '兰吉与帕帕', 'Rangi and Papa', 173.0, -41.0, -2000, ['creation', 'love'], '💞',
    '天父兰吉与地母帕帕拥抱使万物困于黑暗。其子塔尼乔森林之神顶天分二，光自此入。',
    'Sky Father and Earth Mother embraced so tightly their children were crushed in darkness; the forest god Tane forced them apart so light could enter.'],
  ['nz-hine', '希内', 'Hine-nui-te-pō', 173.0, -41.0, -1000, ['death'], '🌑',
    '夜之大女神镇冥界。毛伊潜入其阴道欲偷其心而得永生，被一只小鸟笑声惊醒之她夹死。',
    'The great goddess of night guards the underworld; Maui tried to crawl through her body to win immortality, but a small bird\'s laugh woke her and she crushed him.'],
  ['nz-taniwha', '塔尼瓦', 'Taniwha', 173.0, -41.0, 500, ['dragon'], '🐲',
    '河海中蜥蜴或鲸形之神兽，或守护一族，或吞食人。建路过河前以仪祭之，免之怒。',
    'Reptilian or whale-shaped spirit-beings in rivers and harbours; some protect a tribe, others devour swimmers — engineers still consult tribes before bridging certain waters.'],
];

// ─── USA · 北美原住民 ────────────────────────────────────────────────────
const US: Entry[] = [
  ['us-turtle-island', '大龟岛', 'Turtle Island', -98.0, 39.0, -10000, ['creation', 'beast'], '🐢',
    '洪水之前，天女从天落，水生动物潜入海底取泥，敷于龟背，渐长成大地，即北美大陆。',
    'When Sky Woman fell from above, the diving birds brought mud from the sea floor and spread it on a turtle\'s back — and the turtle grew into North America.'],
  ['us-raven', '渡鸦盗光', 'Raven Steals the Light', -135.0, 56.0, -5000, ['trickster', 'creation'], '🦅',
    '世初黑暗。狡黠渡鸦化身入老者家，知其藏日月星辰于木盒中。鸟变婴儿，盗盒散光于天。',
    'The world was dark until Raven transformed into a human baby, was adopted by the old man who hoarded the sun, moon, and stars — then flew off with them all.'],
  ['us-thunderbird', '雷鸟', 'Thunderbird', -110.0, 45.0, -1000, ['beast'], '⚡',
    '巨鹰般之灵鸟，扇翅生雷，眨眼起电。与水底巨角蛇为天敌，每年战之，山川为之震。',
    'A great eagle-spirit whose wings make thunder and whose eyes flash lightning; eternal enemy of the horned underwater serpent, their battles shake the mountains.'],
  ['us-spider-grandmother', '蜘蛛祖母', 'Spider Grandmother', -110.0, 36.0, -3000, ['creation', 'magic'], '🕷️',
    '霍皮人之祖母蜘蛛，引人民自地底洞窟攀丝而出，织万物之命。',
    'Hopi Spider Grandmother led the people up from the underworlds on her thread and weaves the fates of all that lives.'],
  ['us-pele', '佩雷火山女神', 'Pele of the Volcanoes', -155.5, 19.4, -1000, ['fire', 'creation'], '🌋',
    '夏威夷火山女神，怒时熔岩奔流。家居基拉韦厄火山口，传说有人见之化老妪或美女徘徊路旁。',
    'The Hawaiian goddess of volcanoes lives in Kilauea\'s crater; locals say she walks the roads as an old woman or a beautiful girl asking for a ride.'],
];

// ─── Canada · 加拿大 ──────────────────────────────────────────────────────
const CA: Entry[] = [
  ['ca-sedna', '塞德娜', 'Sedna of the Sea', -75.0, 65.0, -2000, ['flood', 'death'], '🌊',
    '因纽特海神。少女违父之命与海燕私奔，父斩其指投海，化为海豹、海象、鲸；她沉海为冰原之主。',
    'When a young Inuit girl tried to flee her father with a sea-bird, he cut off her fingers — they became the seals, walruses, and whales, and she sank to rule the Arctic Sea.'],
  ['ca-sasquatch', '萨斯夸奇', 'Sasquatch', -123.0, 49.0, 1800, ['beast'], '👣',
    '太平洋西北森林中之大脚野人，毛长身巨，雪地留巨足印于松林之间。原住民曰：恭敬而避之。',
    'A huge hair-covered being walking the Pacific Northwest forests; coastal First Nations say to leave food and never look him in the eye.'],
];

// ─── Mongolia · 蒙古 ────────────────────────────────────────────────────
const MN: Entry[] = [
  ['mn-blue-wolf', '苍狼与白鹿', 'Blue Wolf and Doe', 105.0, 46.9, -1200, ['beast', 'creation'], '🐺',
    '受天命之苍灰狼与白鹿渡过腾汲思海，于不而罕山生孛端察尔，蒙古族之祖。',
    'A heaven-mandated grey-blue wolf and a fallow doe crossed the Tenger Sea; from their union came the ancestor of Genghis Khan\'s line.'],
  ['mn-genghis', '成吉思汗诞生', 'Birth of Genghis Khan', 107.6, 47.9, 1162, ['hero'], '🏹',
    '其母诃额仑梦白光入怀。诞之手握血块如棋子。少年颠沛，娶孛尔帖，结义安答，统蒙古诸部为一汗。',
    'His mother dreamed of light entering her; the baby was born clutching a clot of blood like a stone — a sign he would rule.'],
];

// ─── Nepal · 尼泊尔 / 西藏 ──────────────────────────────────────────────
const NP: Entry[] = [
  ['np-yeti', '雪人耶提', 'Yeti', 86.9, 27.9, 1500, ['beast'], '❄️',
    '喜马拉雅雪线之上之巨人毛兽，红眼白毛，行雪不留印。藏人曰其为山神所遣，勿擒勿杀。',
    'The hairy giant of the Himalayan snowline; Sherpas say he walks above the treeline and his roar is the wind around Everest.'],
  ['np-padma', '莲花生大士', 'Padmasambhava', 85.3, 27.7, 750, ['magic'], '🪷',
    '密宗祖师，由莲花中化生。降伏苯教恶神，于桑耶寺立藏传佛教，藏经于山中为后世取。',
    'Born from a lotus, the second Buddha subdued the wrathful spirits of Tibet, founded the first monastery, and hid teachings in caves for future generations.'],
];

// ─── Ethiopia · 埃塞俄比亚 ──────────────────────────────────────────────
const ET: Entry[] = [
  ['et-sheba', '示巴女王', 'Queen of Sheba', 38.7, 9.1, -950, ['love', 'magic'], '👑',
    '示巴女王玛蓋达远征所罗门之耶路撒冷，骑骆驼载香料黄金。归国前与所罗门生子，遂建埃塞俄比亚之王统。',
    'The queen rode camels of gold and spice to Solomon\'s Jerusalem; she returned bearing his son Menelik, founder of the Ethiopian royal line.'],
  ['et-ark', '约柜', 'The Ark of the Covenant', 38.7, 14.1, -900, ['magic'], '📦',
    '所罗门子门涅利克自耶路撒冷盗约柜归阿克苏姆，密藏一礼拜堂中。守者一人，终生不出门，死前传位继任。',
    'Menelik, son of Solomon and Sheba, brought the Ark from Jerusalem to Aksum, where a single monk guards it for life inside a small chapel.'],
];

// ─── Thailand · 泰国 ────────────────────────────────────────────────────
const TH: Entry[] = [
  ['th-ramakien', '罗摩坚', 'Ramakien', 100.5, 13.7, 1200, ['hero', 'war'], '🎭',
    '泰国版《罗摩衍那》，分上下两层。猴军总督哈奴曼有特殊一战：以尾绕罗刹岛烧之，火光照天三日。',
    'The Thai retelling of the Ramayana: Hanuman wraps his tail around the city of Lanka and burns it for three days and nights.'],
  ['th-naga', '那伽蛇神', 'Phaya Nak the Naga', 102.8, 17.4, 800, ['dragon'], '🐍',
    '湄公河中蛇王。农历十一月十五夜吐火球于江面，泰老两国年俗观之，称"那伽之火"。',
    'The dragon-king of the Mekong; on the full moon of the eleventh lunar month, fireballs rise from the river — Thais and Lao gather for the Naga Fireball Festival.'],
];

// ─── Cambodia · 柬埔寨 ──────────────────────────────────────────────────
const KH: Entry[] = [
  ['kh-naga-angkor', '吴哥蛇王', 'Naga of Angkor', 103.9, 13.4, 1100, ['dragon', 'creation'], '🐍',
    '吴哥窟回廊每柱皆为七头蛇王那伽之身。传印度王子娶蛇王女，蛇父吸海干以献嫁妆，定柬埔寨之祖。',
    'A Hindu prince married the Naga king\'s daughter; her father drank up the sea to give them a land — that is Cambodia, and the temple bridges are his serpent body.'],
];

// ─── Indonesia · 印度尼西亚 ─────────────────────────────────────────────
const ID: Entry[] = [
  ['id-garuda', '迦楼罗', 'Garuda the Sun Eagle', 106.8, -6.2, 800, ['beast', 'hero'], '🦅',
    '毗湿奴之坐骑，金羽巨鹰。曾为母赎奴身，独力潜入天界夺甘露，途中骗诸天而归。',
    'Vishnu\'s mount; this golden-feathered giant once flew into heaven, fought every god, and returned with the elixir of immortality to free his enslaved mother.'],
  ['id-barong-rangda', '巴龙与冷加', 'Barong vs Rangda', 115.2, -8.4, 1000, ['war', 'magic'], '🎭',
    '巴厘善神巴龙狮形与恶巫冷加于神庙广场永斗。舞剧之高潮：信徒入神附身，刺己不伤。',
    'In Bali the lion-like good spirit and the fanged demon witch dance their eternal battle in temple courtyards; possessed dancers stab themselves and bleed nothing.'],
  ['id-borobudur', '婆罗浮屠大塔', 'Borobudur Stupa', 110.2, -7.6, 800, ['magic'], '🛕',
    '爪哇丛林中九层石塔，浮雕千百佛传故事。登塔即修菩萨行：自欲界，色界，无色界，达涅槃。',
    'The Buddhist mountain-temple in Java: pilgrims climbing its nine terraces walk a stone manuscript of every Buddha-life from desire to nirvana.'],
];

// ─── Iceland · 冰岛 (Norse already covered, add extras) ─────────────────
const IS: Entry[] = [
  ['is-huldufolk', '隐藏之民', 'Huldufólk', -19.0, 64.9, 1300, ['magic'], '🪨',
    '冰岛山岩之中住有"隐藏之民"，与人同形而看不见。修筑公路若动其石必有事故，故路常绕之而行。',
    'In Icelandic rocks live the "hidden folk," human-shaped but invisible; roads literally bend around their stones to avoid breakdowns and accidents.'],
  ['is-kraken', '海怪克拉肯', 'Kraken', -19.0, 64.9, 1200, ['beast'], '🐙',
    '挪威与冰岛海上巨章鱼怪，触手能拖战船入海。十六世纪渔人传：见小岛突现于海中，速逃，未必是岛。',
    'A vast tentacled beast off Norway and Iceland; if a new island seems to appear in the sea, sailors say, flee — it may not be an island at all.'],
];

// ─── Finland · 芬兰 ─────────────────────────────────────────────────────
const FI: Entry[] = [
  ['fi-vainamoinen', '维奈莫宁', 'Väinämöinen the Singer', 25.0, 61.9, 800, ['hero', 'magic'], '🎻',
    '《卡勒瓦拉》之老吟游诗人，孕于风母腹中三十年方出。歌可断巨木、引鱼出水、令万物动。',
    'The shamanic bard of the Kalevala spent thirty years in his wind-mother\'s womb; his song could fell trees, raise fish from the sea, and freeze enemies.'],
  ['fi-sampo', '萨姆波磨', 'The Sampo', 25.0, 61.9, 800, ['magic'], '🌾',
    '伊尔玛瑞宁锻造之神磨：一面磨谷、一面磨盐、一面磨金。藏于北国铜山。诸英雄夺之，磨碎沉海，碎屑造福万世。',
    'The blacksmith god forged a mill that ground grain, salt, and gold from three sides; stolen and shattered at sea, its fragments now seed every harvest.'],
  ['fi-louhi', '卢伊', 'Louhi Witch Queen', 25.0, 65.0, 800, ['magic'], '🧙‍♀️',
    '北国波赫约拉之老女王，强大女巫。能盗日月藏于岩中，能化鹰扑英雄之舟，争夺萨姆波磨之大敌。',
    'The crone-queen of the dark North could steal the sun and moon into a mountain and turned herself into a giant eagle to fight for the Sampo.'],
];

// ─── Sri Lanka · 楞伽 ──────────────────────────────────────────────────
const LK: Entry[] = [
  ['lk-ravana', '罗波那十首王', 'Ravana the Ten-Headed King', 80.7, 7.9, -500, ['war', 'beast'], '👑',
    '楞伽十首二十臂之罗刹王，禁欲苦行得大梵之恩，无神不可败。劫罗摩之妻悉多，引印度大军渡海，终败身殒。',
    'The ten-headed twenty-armed demon-king of Lanka won boons that made him unkillable by gods; he kidnapped Sita and brought the Ramayana\'s war to his city.'],
];

// ─── Czechia · 捷克 ───────────────────────────────────────────────────
const CZ: Entry[] = [
  ['cz-golem', '布拉格泥人', 'Golem of Prague', 14.4, 50.1, 1580, ['magic'], '🗿',
    '布拉格拉比莱奥维为护犹太区不受迫害，用伏尔塔瓦河岸黏土塑巨人，舌下藏写"真"字之纸即活。',
    'The Maharal of Prague shaped a giant from Vltava river clay and gave him life with a paper saying "truth" — removing one letter to "death" stopped him.'],
];

// ─── Mali · 西非 ─────────────────────────────────────────────────────
const ML: Entry[] = [
  ['ml-sundiata', '逊迪亚塔', 'Sundiata Keita', -8.0, 12.6, 1235, ['hero', 'war'], '🦁',
    '马里帝国之祖，先天残疾不能行。九岁时立铁杖如树，自此挺立。终率联军于基里纳战胜苏曼吉鲁，建大帝国。',
    'The "Lion King" of Mali could not walk as a child until at nine he stood up by bending an iron rod into a tree; he founded the Mali Empire at the Battle of Kirina.'],
];

// ─── Combined seed export ───────────────────────────────────────────────
export const SEED_STORIES: Story[] = [
  ...build('CHN', '华夏神话', 'Chinese mythology', CN),
  ...build('GRC', '古希腊神话', 'Greek mythology', GR),
  ...build('EGY', '古埃及神话', 'Egyptian mythology', EG),
  ...build('IRQ', '美索不达米亚', 'Mesopotamian mythology', ME),
  ...build('IND', '印度神话', 'Hindu mythology', IN),
  ...build('ISL', '北欧神话', 'Norse mythology', NO),
  ...build('JPN', '日本神话', 'Japanese mythology', JP),
  ...build('KOR', '韩国神话', 'Korean mythology', KR),
  ...build('VNM', '越南神话', 'Vietnamese mythology', VN),
  ...build('ITA', '罗马 / 意大利', 'Roman & Italian', IT),
  ...build('DEU', '日耳曼童话', 'Germanic fairy tales', DE),
  ...build('GBR', '不列颠传说', 'British legend', GB),
  ...build('IRL', '凯尔特神话', 'Celtic / Irish', IE),
  ...build('RUS', '斯拉夫神话', 'Slavic mythology', RU),
  ...build('FRA', '法国传说', 'French legend', FR),
  ...build('ESP', '西班牙传说', 'Spanish legend', ES),
  ...build('SAU', '阿拉伯故事', 'Arabian tales', SA),
  ...build('IRN', '波斯神话', 'Persian mythology', IR),
  ...build('TUR', '突厥神话', 'Turkic mythology', TR),
  ...build('MEX', '阿兹特克 / 玛雅', 'Aztec & Maya', MX),
  ...build('PER', '印加神话', 'Inca mythology', PE),
  ...build('BRA', '巴西民俗', 'Brazilian folklore', BR),
  ...build('NGA', '约鲁巴神话', 'Yoruba mythology', NG),
  ...build('AUS', '原住民梦时代', 'Aboriginal Dreaming', AU),
  ...build('NZL', '毛利神话', 'Maori mythology', NZ),
  ...build('USA', '北美原住民', 'Native American', US),
  ...build('CAN', '因纽特 / 加拿大', 'Inuit / Canadian', CA),
  ...build('MNG', '蒙古神话', 'Mongolian', MN),
  ...build('NPL', '尼泊尔 / 藏', 'Nepali / Tibetan', NP),
  ...build('ETH', '埃塞俄比亚', 'Ethiopian', ET),
  ...build('THA', '泰国神话', 'Thai mythology', TH),
  ...build('KHM', '高棉神话', 'Khmer mythology', KH),
  ...build('IDN', '印度尼西亚', 'Indonesian', ID),
  ...build('ISL', '冰岛传说', 'Icelandic folk', IS),
  ...build('FIN', '芬兰史诗', 'Finnish Kalevala', FI),
  ...build('LKA', '楞伽神话', 'Lankan epic', LK),
  ...build('CZE', '布拉格传说', 'Prague legend', CZ),
  ...build('MLI', '西非帝国', 'West African epic', ML),
];

export const SEED_COUNT = SEED_STORIES.length;
