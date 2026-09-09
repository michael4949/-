# -*- coding: utf-8 -*-
import base64, os, io, re, sys
B = os.path.dirname(os.path.abspath(__file__)) + os.sep
logo = base64.b64encode(open(os.path.join(B, '..', 'assets', 'logo.png'), 'rb').read()).decode()
css = open(B + 'style.css', encoding='utf-8').read()
parts = ['data.js', 'know.js', 'avatar.js', 'player.js', 'guide.js', 'layout.js', 'app1.js', 'sld.js', 'app2.js', 'panels.js', 'fill.js', 'app3.js', 'app4.js', 'arena.js', 'charts.js', 'homedata.js', 'home.js', 'pagedata.js', 'pages.js']
js = '\n\n'.join(open(B + p, encoding='utf-8').read() for p in parts)
js = js.replace('__LOGO__', 'data:image/png;base64,' + logo)
import json
imgs = {}
cdir = os.path.join(B, '..', 'assets', 'coaches')
if os.path.isdir(cdir):
    for f in sorted(os.listdir(cdir)):
        m = re.match(r'([a-z0-9_]+)\.(png|jpe?g|webp)$', f, re.I)
        if m:
            mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp'}[m.group(2).lower()]
            imgs[m.group(1)] = 'data:%s;base64,%s' % (mime, base64.b64encode(open(os.path.join(cdir, f), 'rb').read()).decode())
js = js.replace('__COACH_IMGS__', json.dumps(imgs, ensure_ascii=False))

html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>小瓦特·练 · AI智能陪练底座</title>
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
out = os.path.join(B, 'dist', '小瓦特练_倒闸操作陪练舱_高保真原型.html')
os.makedirs(os.path.join(B, 'dist'), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('OK', len(html), out)
