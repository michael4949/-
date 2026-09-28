"""背景音乐：离线合成的轻科技氛围曲（C 大调 I–V–vi–IV，90 BPM），分层循环 + 段落编排 + 混响，输出 audio/bgm.wav（48k 立体声）"""
import json, numpy as np, soundfile as sf
from scipy.signal import fftconvolve

ROOT = __file__.rsplit('/', 1)[0]
SR = 48000
plan = json.load(open(ROOT + '/plan.json'))
TOTAL = plan['total'] + 1.0
BPM = 90; BEAT = 60 / BPM; BAR = 4 * BEAT; CH = 2 * BAR; CYCLE = 4 * CH
rng = np.random.default_rng(7)

def hz(m): return 440 * 2 ** ((m - 69) / 12)
# 和弦（MIDI）：Cmaj9, G/B add, Am7, Fmaj7
CHORDS = [[48, 55, 60, 64, 67, 71], [47, 55, 59, 62, 67, 74], [45, 52, 57, 60, 64, 67], [41, 53, 57, 60, 64, 69]]
ARP = [[72, 76, 79, 83, 84, 83, 79, 76], [71, 74, 79, 83, 86, 83, 79, 74], [69, 72, 76, 79, 81, 79, 76, 72], [65, 69, 72, 76, 77, 76, 72, 69]]
BASS = [36, 35, 33, 29]

def env(n, a, r):
    e = np.ones(n); ka = int(a * SR); kr = int(r * SR)
    e[:ka] = np.linspace(0, 1, ka) ** 1.5; e[-kr:] *= np.linspace(1, 0, kr) ** 1.2
    return e

def layer_len(): return int(CYCLE * SR)

def pad():
    out = np.zeros((layer_len() + int(3 * SR), 2))
    for ci, ch in enumerate(CHORDS):
        n = int((CH + 1.6) * SR); t = np.arange(n) / SR; e = env(n, 1.4, 1.8)
        for m in ch[1:]:
            for side, det in ((0, -0.06), (1, 0.06)):
                f = hz(m) * 2 ** (det / 12)
                w = sum(np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28)) / k ** 1.7 for k in range(1, 6))
                trem = 1 + 0.08 * np.sin(2 * np.pi * 0.23 * t + side)
                s0 = int(ci * CH * SR); out[s0:s0 + n, side] += 0.05 * w * e * trem
    # 首尾交叠处理成无缝循环
    L = layer_len(); tail = out[L:]; out = out[:L].copy(); out[:len(tail)] += tail
    return out

def pluck(f, dur, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    w = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.12) + 0.12 * bright * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.06)
    e = np.exp(-t / 0.42) * np.minimum(1, t / 0.004)
    return w * e

def arp(variant):
    out = np.zeros((layer_len() + SR, 2)); step = BEAT / 2
    for ci in range(4):
        notes = ARP[ci] if variant == 0 else ARP[ci][::-1]
        for k in range(int(CH / step)):
            m = notes[k % 8] + (12 if variant == 1 and k % 4 == 3 else 0)
            p = pluck(hz(m), 1.2, 0.8 + 0.2 * (k % 2)); s0 = int((ci * CH + k * step) * SR)
            vel = 0.075 * (1.0 if k % 2 == 0 else 0.72) * (1.08 if k % 8 == 0 else 1)
            pan = 0.5 + 0.28 * np.sin(k * 0.9)
            out[s0:s0 + len(p), 0] += p * vel * (1 - pan) * 2 * 0.5
            out[s0:s0 + len(p), 1] += p * vel * pan * 2 * 0.5
    L = layer_len(); tail = out[L:]; out = out[:L].copy(); out[:len(tail)] += tail
    return out

def bass():
    out = np.zeros((layer_len() + SR, 2))
    for ci in range(4):
        f = hz(BASS[ci])
        for b in range(8):
            if b % 4 == 3: continue
            n = int(BEAT * 1.6 * SR); t = np.arange(n) / SR
            w = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.5) * np.minimum(1, t / 0.01)
            s0 = int((ci * CH + b * BEAT) * SR); out[s0:s0 + n] += 0.11 * w[:, None]
    L = layer_len(); tail = out[L:]; out = out[:L].copy(); out[:len(tail)] += tail
    return out

def drums():
    out = np.zeros((layer_len() + SR, 2))
    kn = int(0.35 * SR); t = np.arange(kn) / SR
    kick = np.sin(2 * np.pi * (48 * t + (110 - 48) * 0.045 * (1 - np.exp(-t / 0.045)))) * np.exp(-t / 0.16)
    hn = int(0.09 * SR); th = np.arange(hn) / SR
    for b in range(int(CYCLE / BEAT)):
        s0 = int(b * BEAT * SR)
        if b % 2 == 0: out[s0:s0 + kn] += 0.16 * kick[:, None]
        noise = np.diff(rng.standard_normal(hn + 1)) * np.exp(-th / 0.018)
        s1 = int((b + 0.5) * BEAT * SR); pan = 0.35 if b % 2 else 0.65
        out[s1:s1 + hn, 0] += 0.022 * noise * (1 - pan); out[s1:s1 + hn, 1] += 0.022 * noise * pan
        if b % 4 == 2:   # 轻拍
            cn = int(0.18 * SR); tc = np.arange(cn) / SR
            clap = np.diff(rng.standard_normal(cn + 1)) * np.exp(-tc / 0.05)
            out[s0:s0 + cn] += 0.03 * clap[:, None]
    L = layer_len(); tail = out[L:]; out = out[:L].copy(); out[:len(tail)] += tail
    return out

N = int(TOTAL * SR)
def tile(x): r = int(np.ceil(N / len(x))) + 1; return np.tile(x, (r, 1))[:N]

P, A0, A1, B, D = tile(pad()), tile(arp(0)), tile(arp(1)), tile(bass()), tile(drums())
tt = np.arange(N) / SR

def ramp(points):
    """分段线性增益曲线 [(秒, 增益)…]"""
    xs, ys = zip(*points); return np.interp(tt, xs, ys)[:, None]

runs = {r['scene']: r for r in plan['runs']}
b0, b1 = runs['banzu']['start'], runs['banzu']['end']
e1 = plan['total']
g_pad = ramp([(0, 0), (2.5, 1), (e1 - 3, 1), (e1 + 0.5, 0)])
g_arp = ramp([(0, 0), (4.5, 0), (7, 1), (e1 - 2.5, 1), (e1, 0)])
g_bass = ramp([(0, 0), (b0 - 6, 0), (b0 - 1, 1), (b1 + 1, 1), (b1 + 4, 0.6), (e1 - 2, 0.6), (e1, 0)])
g_drum = ramp([(0, 0), (b0 - 2, 0), (b0 + 1, 1), (b1 - 2, 1), (b1 + 1, 0), (e1, 0)])
# 两个琶音变体按循环交替、交叉淡化
cyc = (tt / CYCLE) % 2; x = np.clip((np.abs(cyc - 1) - 0.47) / 0.06, 0, 1)[:, None]   # 0→A1, 1→A0
arp_mix = A0 * x + A1 * (1 - x)
dry = P * g_pad + arp_mix * g_arp + B * g_bass + D * g_drum

# 混响：指数衰减的立体声噪声冲激响应
irn = int(2.4 * SR); ti = np.arange(irn) / SR
ir = rng.standard_normal((irn, 2)) * np.exp(-ti / 0.55)[:, None]; ir[:int(0.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(dry[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = 0.78 * dry + 0.42 * wet
mix = np.tanh(mix * 1.1) / 1.1
mix *= 10 ** (-19 / 20) / np.sqrt(np.mean(mix ** 2))   # RMS ≈ -16 dBFS
mix = np.clip(mix, -0.98, 0.98)
sf.write(ROOT + '/audio/bgm.wav', mix.astype(np.float32), SR)
print('bgm', round(N / SR, 1), 's  peak', round(float(np.abs(mix).max()), 3))
