"""时间轴：script.json + audio/timing.json → plan.json（段落起止、分组录制、步骤绝对时间、字幕分句）"""
import json, re, sys
import numpy as np, soundfile as sf

ROOT = __file__.rsplit('/', 1)[0]
TARGET = float(sys.argv[1]) if len(sys.argv) > 1 else 480.0
PRE, XF = 0.3, 0.5   # 默认段前停顿、场景交叉淡化

sc = json.load(open(ROOT + '/script.json'))
tm = json.load(open(ROOT + '/audio/timing.json'))
segs = sc['segments']

# 解出默认段后停顿，使总长 = TARGET
fixed = sum(s.get('fixed', 0) for s in segs)
narr = sum(tm[s['id']] + s.get('pre', PRE) for s in segs if s['text'])
extra_post = sum(s['post'] for s in segs if s['text'] and 'post' in s)
n_free = sum(1 for s in segs if s['text'] and 'post' not in s)
POST = (TARGET - fixed - narr - extra_post) / n_free
assert 0.3 < POST < 2.5, POST


def pauses(wav):
    """返回语音中的停顿中点（秒），用于把字幕分句对齐到自然停顿"""
    x, sr = sf.read(wav)
    if x.ndim > 1: x = x.mean(1)
    hop = int(sr * 0.01)
    e = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    quiet = e < 0.012
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if j - i >= 9: out.append(((i + j) / 2) * 0.01)
            i = j
        else: i += 1
    return out


def chunks(text):
    """按标点切成字幕行（每行 ≤ 22 字）：先句读，再挑最均衡的逗号、顿号、书名号后断开，不断在书名号和引号里"""
    def split(p):
        if len(p) <= 22: return [p]
        best, depth = None, 0
        for i, ch in enumerate(p[:-1]):
            depth += ch in '《“' ; depth -= ch in '》”'
            if i < 4 or i > len(p) - 5: continue
            pen = {'，': 0, '、': 4, '》': 3, '”': 3}.get(ch, None if depth else 10)
            if pen is None: continue
            sc = abs(i + 1 - len(p) / 2) + pen
            if best is None or sc < best[0]: best = (sc, i + 1)
        k = best[1]
        return split(p[:k]) + split(p[k:])
    out = []
    for p in [p for p in re.split(r'(?<=[。！？；：])', text) if p.strip()]:
        out += split(p)
    return out


def clean(c):
    return re.sub(r'[，。；：、]+$', '', c).strip()


def weight(c):
    return max(1, len(re.sub(r'[，。；：、！？“”《》·\s]', '', c))) + 1.2 * len(re.findall(r'[，。；：、]', c))


t = 0.0
plan = {'total': TARGET, 'post': POST, 'xf': XF, 'segments': [], 'runs': [], 'subs': []}
for s in segs:
    pre = s.get('pre', PRE) if s['text'] else 0
    dur = tm[s['id']] if s['text'] else s.get('fixed', 0)
    post = s.get('post', POST) if s['text'] else 0
    seg = {'id': s['id'], 'scene': s['scene'], 'start': round(t, 3), 'nstart': round(t + pre, 3), 'dur': dur,
           'end': round(t + pre + dur + post, 3), 'chapter': s.get('chapter'), 'text': s['text'], 'steps': []}
    for st in s.get('steps', []):
        at = st[0]
        if isinstance(at, str) and at.endswith('%'): at = pre + float(at[:-1]) / 100 * dur
        seg['steps'].append([round(t + at, 3)] + st[1:])
    if s['text']:
        cs = s.get('subs') or chunks(s['text'])
        w = np.cumsum([weight(c) for c in cs]); w = w / w[-1]
        ps = pauses(f"{ROOT}/audio/{s['id']}.wav")
        bounds = [0.0]
        for k in range(len(cs) - 1):
            est = w[k] * dur
            near = [p for p in ps if abs(p - est) < 0.9 and p > bounds[-1] + 0.6]
            bounds.append(min(near, key=lambda p: abs(p - est)) if near else est)
        bounds.append(dur)
        for k, c in enumerate(cs):
            a = seg['nstart'] + bounds[k]; b = seg['nstart'] + bounds[k + 1]
            if k == len(cs) - 1: b += min(0.5, post)
            plan['subs'].append([round(a, 3), round(b, 3), clean(c)])
    plan['segments'].append(seg)
    t = seg['end']

# 相邻同场景的段落合成一次录制
for seg in plan['segments']:
    r = plan['runs'][-1] if plan['runs'] else None
    if r and r['scene'] == seg['scene']:
        r['end'] = seg['end']; r['segs'].append(seg['id'])
    else:
        plan['runs'].append({'id': f"r{len(plan['runs'])}_{seg['scene']}", 'scene': seg['scene'], 'start': seg['start'], 'end': seg['end'], 'segs': [seg['id']]})
json.dump(plan, open(ROOT + '/plan.json', 'w'), ensure_ascii=False, indent=1)
print('total %.1f  default post %.2f  runs %s  subs %d' % (t, POST, [(r['id'], round(r['end'] - r['start'], 1)) for r in plan['runs']], len(plan['subs'])))
