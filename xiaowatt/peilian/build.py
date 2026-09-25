# -*- coding: utf-8 -*-
import base64, os, io, re, sys
B = os.path.dirname(os.path.abspath(__file__)) + os.sep
logo = base64.b64encode(open(os.path.join(B, '..', 'assets', 'logo.png'), 'rb').read()).decode()
css = open(B + 'style.css', encoding='utf-8').read()
parts = ['core.js', 'charts.js', 'rules.js', 'optic.js', 'judge.js', 'emerg.js', 'recs.js', 'home.js', 'pages.js', 'leader.js', 'p_ticket.js', 'p_emerg.js', 'p_plat.js']
js = '\n\n'.join(open(B + p, encoding='utf-8').read() for p in parts)
js = js.replace('__LOGO__', 'data:image/png;base64,' + logo)

html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>小瓦特·练 · AI智能陪练平台</title>
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
out = os.path.join(B, 'dist', '小瓦特练_AI智能陪练平台_高保真原型.html')
os.makedirs(os.path.join(B, 'dist'), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('OK', len(html), out)
