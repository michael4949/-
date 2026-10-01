# -*- coding: utf-8 -*-
import base64, os, io, re, sys
B = os.path.dirname(os.path.abspath(__file__)) + os.sep
logo = base64.b64encode(open(os.path.join(B, '..', 'assets', 'logo.png'), 'rb').read()).decode()
css = open(B + 'style.css', encoding='utf-8').read()
# 字体内联：../assets/fonts/*.woff2 → @font-face（Manrope 可变字重，拉丁与数字；中文走系统字体）
fdir = os.path.join(B, '..', 'assets', 'fonts')
faces = []
if os.path.isdir(fdir):
    for f in sorted(os.listdir(fdir)):
        m = re.match(r'([A-Za-z]+)-(var|\d+)\.woff2$', f)
        if m:
            b64 = base64.b64encode(open(os.path.join(fdir, f), 'rb').read()).decode()
            w = '200 800' if m.group(2) == 'var' else m.group(2)
            faces.append("@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}" % (m.group(1), w, b64))
    for f in sorted(os.listdir(fdir)):
        if f.endswith('.css'):
            faces.append(open(os.path.join(fdir, f), encoding='utf-8').read())
css = css.replace('/*__FONTS__*/', '\n'.join(faces))
parts = ['core.js', 'charts.js', 'rules.js', 'optic.js', 'judge.js', 'emerg.js', 'recs.js', 'home.js', 'pages.js', 'leader.js', 'p_ticket.js', 'p_emerg.js', 'p_plat.js', 'avatar.js', 'pipe.js', 'learn.js', 'p_scene.js']
js = '\n\n'.join(open(B + p, encoding='utf-8').read() for p in parts)
js = js.replace('__LOGO__', 'data:image/png;base64,' + logo)
# 数字人讲师形象（assets/coaches）：只打包讲课用到的三个形象，_hd 为 512px 版本
import json
imgs = {}
cdir = os.path.join(B, '..', 'assets', 'coaches')
for key in ['term', 'term_hd', 'angui', 'angui_hd', 'daozha', 'daozha_hd']:
    f = os.path.join(cdir, key + '.jpg')
    if os.path.exists(f):
        imgs[key] = 'data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
js = js.replace('__COACH_IMGS__', json.dumps(imgs, ensure_ascii=False))

html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>安全学习智能陪练 · 一切事故都可以预防</title>
<style>
{css}
</style>
</head>
<body></body>
<script>
{js}
try{{ boot(); }}catch(e){{ document.body.innerHTML='<pre style="color:#ff9aa8;padding:24px;white-space:pre-wrap">'+e.stack+'</pre>'; }}
</script>
</html>"""
out = os.path.join(B, 'dist', '安全学习智能陪练_高保真原型.html')
os.makedirs(os.path.join(B, 'dist'), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('OK', len(html), out)
