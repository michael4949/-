"""混音与封装：配音按时间轴落位 + 背景音乐随人声自动压低 + 响度标准化（-16 LUFS）→ 与画面合成 out/<名>.mp4，并写同名 .srt"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.abspath(__file__))
FF = '/usr/local/bin/ffmpeg'
SR = 48000
NAME = sys.argv[1] if len(sys.argv) > 1 else '小瓦特班_班组长AI助手_介绍视频'
plan = json.load(open(f'{ROOT}/plan.json'))
N = int((plan['total'] + 0.2) * SR)

voice = np.zeros(N)
spans = []
for s in plan['segments']:
    if not s['text']: continue
    x, sr = sf.read(f"{ROOT}/audio/{s['id']}.wav")
    if x.ndim > 1: x = x.mean(1)
    x = resample_poly(x, SR, sr) if sr != SR else x
    a = int(s['nstart'] * SR); voice[a:a + len(x)] += x[:N - a]
    spans.append((s['nstart'], s['nstart'] + len(x) / SR))
# 人声先做统一电平（RMS ≈ -19 dBFS，峰值不过 -1 dB）
act = np.abs(voice) > 1e-4
voice *= 10 ** (-19 / 20) / np.sqrt(np.mean(voice[act] ** 2))
voice = np.clip(voice, -0.89, 0.89)

bgm, bsr = sf.read(f'{ROOT}/audio/bgm.wav')
bgm = bgm[:N] if len(bgm) >= N else np.pad(bgm, ((0, N - len(bgm)), (0, 0)))
# 压低包络：说话时 -18 dB 相对，停顿与片头片尾回到 -8 dB；0.35 s 过渡
t = np.arange(N) / SR
g = np.full(N, 10 ** (-8 / 20))
low = 10 ** (-18 / 20)
for a, b in spans:
    a2, b2 = int(max(0, a - 0.25) * SR), int(min(N / SR, b + 0.15) * SR)
    g[a2:b2] = low
# 平滑（0.35 s 滑动平均两次）
k = int(0.35 * SR)
def movavg(x, k):
    c = np.cumsum(np.pad(x, (k // 2, k - k // 2), mode='edge')); return (c[k:] - c[:-k]) / k
g = movavg(movavg(g, k), k)[:N]
mix = bgm * g[:, None] + voice[:, None]
peak = np.abs(mix).max()
if peak > 0.97: mix *= 0.97 / peak
os.makedirs(f'{ROOT}/out', exist_ok=True)
sf.write(f'{ROOT}/out/mix_raw.wav', mix.astype(np.float32), SR)

# 两遍 loudnorm
r = subprocess.run([FF, '-hide_banner', '-i', f'{ROOT}/out/mix_raw.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr).group(0))
af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', f'{ROOT}/out/mix_raw.wav', '-af', af, '-ar', '48000', f'{ROOT}/out/mix.wav'], check=True)

# 字幕文件
def ts(x):
    h, x = divmod(x, 3600); mnt, x = divmod(x, 60); s = int(x); ms = int(round((x - s) * 1000))
    if ms == 1000: s, ms = s + 1, 0
    return f'{int(h):02d}:{int(mnt):02d}:{s:02d},{ms:03d}'
srt = ''.join(f'{i + 1}\n{ts(a)} --> {ts(b)}\n{txt}\n\n' for i, (a, b, txt) in enumerate(plan['subs']))
open(f'{ROOT}/out/{NAME}.srt', 'w', encoding='utf-8').write(srt)

if os.path.exists(f'{ROOT}/out/video_only.mp4'): subprocess.run([FF, '-y', '-loglevel', 'error', '-i', f'{ROOT}/out/video_only.mp4', '-i', f'{ROOT}/out/mix.wav',
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
                '-metadata', 'title=小瓦特·班 · 供电所班组长 AI 助手 · 介绍视频', f'{ROOT}/out/{NAME}.mp4'], check=True)
print('input loudness', m['input_i'], 'LUFS →', f'out/{NAME}.mp4')
