# -*- coding: utf-8 -*-
"""构建：拼接源码 → dist/ 单文件 HTML（纯标准库）。
内联：客户 logo（__LOGO__）、小瓦特形象图（assets/xiaowatt/{main,talk,think,look,work,listen}.png → __XW_IMGS__，缺省用内置 SVG）。"""
import base64, os, re, json
B = os.path.dirname(os.path.abspath(__file__)) + os.sep
logo = base64.b64encode(open(os.path.join(B, '..', 'assets', 'logo.png'), 'rb').read()).decode()
css = open(B + 'style.css', encoding='utf-8').read()
parts = ['data.js', 'xw.js', 'comp.js', 'app.js', 'p_home.js', 'p_people.js', 'p_sched.js', 'p_safety.js', 'p_train.js', 'p_doc.js', 'p_know.js', 'p_ledger.js', 'intent.js']
js = '\n\n'.join(open(B + p, encoding='utf-8').read() for p in parts)
js = js.replace('__LOGO__', 'data:image/png;base64,' + logo)
imgs = {}
xdir = os.path.join(B, '..', 'assets', 'xiaowatt')
if os.path.isdir(xdir):
    for f in sorted(os.listdir(xdir)):
        m = re.match(r'(main|talk|think|look|work|listen)\.(png|jpe?g|webp)$', f, re.I)
        if m:
            mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp'}[m.group(2).lower()]
            imgs[m.group(1).lower()] = 'data:%s;base64,%s' % (mime, base64.b64encode(open(os.path.join(xdir, f), 'rb').read()).decode())
js = js.replace('__XW_IMGS__', json.dumps(imgs, ensure_ascii=False) if imgs else 'null')
html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>小瓦特·班 · 班组长 AI 助手</title>
<style>
{css}
</style>
</head>
<body></body>
<script>
{js}
try{{ boot(); }}catch(e){{ document.body.innerHTML='<pre style="color:#e5484d;padding:24px;white-space:pre-wrap">'+e.stack+'</pre>'; }}
</script>
</html>"""
out = os.path.join(B, 'dist', '小瓦特班_班组长AI助手_高保真原型.html')
os.makedirs(os.path.join(B, 'dist'), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('OK', len(html), out, 'xw imgs:', list(imgs.keys()) or 'builtin svg')
