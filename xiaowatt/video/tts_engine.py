import sherpa_onnx, soundfile as sf, sys, json, os
M = os.environ.get('TTS_MODEL', '/root/ttsmodels/kokoro-multi-lang-v1_1')   # sherpa-onnx 的 kokoro-multi-lang-v1_1 模型目录
_tts = None
def tts():
    global _tts
    if _tts is None:
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                    model=f'{M}/model.onnx', voices=f'{M}/voices.bin', tokens=f'{M}/tokens.txt',
                    data_dir=f'{M}/espeak-ng-data', dict_dir=f'{M}/dict', lexicon=f'{M}/lexicon-us-en.txt,{M}/lexicon-zh.txt'),
                num_threads=4, provider='cpu'),
            rule_fsts=f'{M}/date-zh.fst,{M}/phone-zh.fst,{M}/number-zh.fst', max_num_sentences=1)
        _tts = sherpa_onnx.OfflineTts(cfg)
    return _tts
def say(text, out, sid=3, speed=1.0):
    a = tts().generate(text, sid=sid, speed=speed)
    sf.write(out, a.samples, samplerate=a.sample_rate, subtype='PCM_16')
    return len(a.samples) / a.sample_rate
