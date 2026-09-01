# -*- coding: utf-8 -*-
"""教练头像认领：把任意命名的头像图按名称关键词匹配到教练 id。
用法: python3 ingest_avatars.py <源目录>
  源目录里的 png/jpg/jpeg/webp 按文件名匹配教练 → 复制为 ../assets/coaches/<id>.<ext>
  匹配不到 / 一图多中会逐个列出，人工确认后重跑或手工改名。
"""
import os, re, shutil, sys

# id → 匹配关键词（任意命中即认领；先长词后短词，避免误吃）
KEYS = [
    ('daozha', ['倒闸', '陈志远']),
    ('abn',    ['事故异常', '异常处置推演', '异常']),
    ('patrol', ['巡视']),
    ('test',   ['高压试验', '试验交底', '试验']),
    ('anco',   ['检修安全措施', '安措布置', '安全措施']),
    ('relay',  ['二次安措', '定值单', '二次']),
    ('dnet',   ['配网抢修', '抢修工单', '抢修']),
    ('live',   ['带电作业']),
    ('term',   ['调度术语']),
    ('order',  ['接发令', '接令']),
    ('cust',   ['停电施工', '现场沟通', '客户沟通']),
    ('comp',   ['投诉']),
    ('biz',    ['业扩', '报装', '勘查']),
    ('angui',  ['安规']),
    ('fire',   ['消防', '应急处置']),
    ('space',  ['有限空间']),
    ('meet',   ['安全日', '活动主持']),
    ('mentor', ['新员工', '岗前引导', '师带徒']),
]

def main(src):
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'coaches')
    os.makedirs(dst, exist_ok=True)
    files = [f for f in sorted(os.listdir(src)) if re.search(r'\.(png|jpe?g|webp)$', f, re.I)]
    if not files:
        print('源目录里没有图片'); return
    taken, report = {}, []
    for f in files:
        base = os.path.splitext(f)[0]
        hits = [cid for cid, ks in KEYS if any(k in base for k in ks)]
        if len(hits) == 1 and hits[0] not in taken:
            cid = hits[0]
            ext = os.path.splitext(f)[1].lower().replace('jpeg', 'jpg')
            shutil.copyfile(os.path.join(src, f), os.path.join(dst, cid + ext))
            taken[cid] = f
            report.append(f'✓ {f}  →  {cid}{ext}')
        elif len(hits) > 1:
            report.append(f'? {f}  命中多个：{hits}（请改名后重跑）')
        elif hits and hits[0] in taken:
            report.append(f'? {f}  与「{taken[hits[0]]}」都匹配 {hits[0]}（请人工确认）')
        else:
            report.append(f'✗ {f}  未匹配任何教练')
    print('\n'.join(report))
    missing = [cid for cid, _ in KEYS if cid not in taken]
    print(f'\n认领 {len(taken)}/18' + (f'，缺：{missing}' if missing else '，齐了。跑 python3 build.py 即内联到教练卡。'))

if __name__ == '__main__':
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    main(sys.argv[1])
