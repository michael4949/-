"""真题样例种子库。

每个学科若干道近年河北中考真题片段,供 Analyst 参考。
生产环境应替换为正式的真题库检索(向量检索 + 关键词召回)。
"""

from __future__ import annotations

SEED_REAL_QUESTIONS: dict[str, list[dict[str, str]]] = {
    "数学": [
        {
            "year": "2024",
            "stem": "据统计,2023 年河北省 GDP 总量约为 43944 亿元,这个数据用科学记数法表示为(  )",
            "knowledge_points": "科学记数法,实数",
            "difficulty": "易",
        },
        {
            "year": "2024",
            "stem": "如图,在 △ABC 中,∠ACB=90°,以 AC 为直径的 ⊙O 交 AB 于点 D,过点 D 作 ⊙O 的切线交 BC 于点 E。求证:E 是 BC 的中点。",
            "knowledge_points": "圆,切线性质,三角形中位线",
            "difficulty": "难",
        },
        {
            "year": "2023",
            "stem": "为弘扬中华优秀传统文化,某校举办了诗词大赛。比赛分初赛、决赛两阶段。初赛 200 人参加,决赛仅录取前 30 名。某同学初赛成绩为 92 分(满分 100),已知初赛参赛者平均分为 75 分,中位数为 78 分。该同学能否进入决赛,需要看自己排名属于(  )",
            "knowledge_points": "统计,平均数,中位数",
            "difficulty": "中",
        },
    ],
    "物理": [
        {
            "year": "2024",
            "stem": "京津冀协同发展,京雄城际铁路全长约 92 km,雄安新区到北京西站最快只需 50 分钟。求该列车的平均速度。",
            "knowledge_points": "速度,平均速度",
            "difficulty": "易",
        },
        {
            "year": "2023",
            "stem": "如图所示,小华用滑轮组将重 200 N 的物体匀速提升 2 m,所用拉力为 120 N。求滑轮组的机械效率。",
            "knowledge_points": "滑轮组,机械效率,功",
            "difficulty": "中",
        },
    ],
    "语文": [
        {
            "year": "2024",
            "stem": "下列加点字读音完全正确的一项是(  )\nA. 蹒跚(mán)  炽热(chì)\n...",
            "knowledge_points": "字音",
            "difficulty": "易",
        },
        {
            "year": "2023",
            "stem": "阅读下面的材料,回答问题。材料一:雄安新区设立以来 ...(三则材料,围绕新发展理念)。结合三则材料,谈谈你对'新质生产力'的理解。",
            "knowledge_points": "非连续性文本阅读,信息整合,观点表达",
            "difficulty": "中",
        },
    ],
    "英语": [
        {
            "year": "2024",
            "stem": "—Have you ever been to Xiongan New Area?\n—Yes. I _____ there twice last summer.\nA. have gone  B. have been  C. went  D. go",
            "knowledge_points": "动词时态,一般过去时与现在完成时辨析",
            "difficulty": "中",
        },
    ],
    "化学": [
        {
            "year": "2024",
            "stem": "下列河北本地非物质文化遗产的制作过程中,涉及化学变化的是(  )\nA. 蔚县剪纸  B. 武强年画  C. 衡水内画  D. 沧州酱菜的腌制",
            "knowledge_points": "物理变化与化学变化",
            "difficulty": "易",
        },
    ],
    "道德与法治": [
        {
            "year": "2024",
            "stem": "习近平总书记考察河北时强调:'要把雄安新区打造成 ...'。下列做法符合这一要求的是(  )",
            "knowledge_points": "国家发展战略,社会主义核心价值观",
            "difficulty": "易",
        },
    ],
}


def lookup_reference_questions(
    subject: str,
    knowledge_points: list[str],
    limit: int = 2,
) -> list[str]:
    """根据学科和知识点检索参考真题。

    生产环境实现:
    - 用向量数据库(如 Qdrant、Pinecone)对真题做语义检索
    - 用 BM25 / Elasticsearch 做关键词召回
    - 融合后取 top-K

    当前是关键词匹配的最小可用实现。
    """
    candidates = SEED_REAL_QUESTIONS.get(subject, [])
    if not candidates:
        return []

    target_kps = " ".join(knowledge_points)
    scored: list[tuple[int, str]] = []
    for q in candidates:
        score = 0
        for kp in knowledge_points:
            if kp in q.get("knowledge_points", ""):
                score += 10
            if kp in q.get("stem", ""):
                score += 3
        if score > 0:
            stem_preview = q["stem"][:200]
            scored.append((score, f"({q['year']} 河北)知识点:{q['knowledge_points']}。题干:{stem_preview}"))

    scored.sort(reverse=True)
    return [s[1] for s in scored[:limit]]
