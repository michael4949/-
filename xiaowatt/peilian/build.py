# -*- coding: utf-8 -*-
import base64, os, io, re, sys
B = os.path.dirname(os.path.abspath(__file__)) + os.sep
logo = base64.b64encode(open(os.path.join(B, '..', 'assets', 'logo.png'), 'rb').read()).decode()
css = open(B + 'style.css', encoding='utf-8').read()
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
