"""逐段合成旁白：script.json → audio/<id>.wav + audio/timing.json（每段时长）"""
import json, os, re, sys, soundfile as sf, numpy as np
from tts_engine import say
D = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(D, 'script.json'), encoding='utf-8'))
os.makedirs(os.path.join(D, 'audio'), exist_ok=True)
def norm(t):
    t = re.sub(r'[《》“”「」"]', '', t).replace('·', '').replace('、', '，')
    t = t.replace('F02', 'F零二')
    return t
tim = {}
only = set(sys.argv[1:])
tp = os.path.join(D, 'audio', 'timing.json')
if os.path.exists(tp): tim = json.load(open(tp))
for s in S['segments']:
    if not s['text'] or (only and s['id'] not in only): continue
    out = os.path.join(D, 'audio', s['id'] + '.wav')
    say(norm(s['text']), out, sid=S['voice']['sid'], speed=S['voice']['speed'])
    x, sr = sf.read(out)
    nz = np.where(np.abs(x) > 0.004)[0]                      # 去掉首尾静音，时长以有声部分为准
    x = x[max(0, nz[0] - int(.03 * sr)): nz[-1] + int(.08 * sr)]
    sf.write(out, x, sr, subtype='PCM_16')
    tim[s['id']] = round(len(x) / sr, 3)
    print(s['id'], tim[s['id']], len(s['text']), flush=True)
    json.dump(tim, open(tp, 'w'), indent=1)
print('TOTAL', round(sum(tim.values()), 1))
