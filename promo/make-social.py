"""Renders the GitHub social preview (1280x640, under 1 MB) with headless Chrome."""
import html, json, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(HERE, '.html')
os.makedirs(TMP, exist_ok=True)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
WORD = json.load(open(os.path.join(HERE, 'logo-words.json')))['shadow']

BODY = r"""         .-----.
        /       \
       |  ^   ^  |___
       |     .   ____)
        \_______/   V
           ))
          ((
           ))
       .--''''--.
     /  ~~~~~~~~  \
    |  ~~~~~~~~~~  |==>
     \.___    ___./
          |  |
          |  |   *sass*
         _|  |_"""

page = f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1280px;height:640px;overflow:hidden;font-family:Menlo,"SF Mono",monospace;
 background:radial-gradient(circle at 28% 40%,#3b1131,#0b070c 72%);display:flex;align-items:center;gap:56px;padding:0 72px}}
.pink{{background:linear-gradient(180deg,#ffb3ec,#ff6fd8 45%,#d6339f);-webkit-background-clip:text;background-clip:text;color:transparent}}
pre{{font-family:inherit;font-weight:700;line-height:1.08}}
.left{{display:flex;flex-direction:column;align-items:flex-start;gap:6px}}
.bubble{{border:3px solid #ff6fd8;border-radius:16px;padding:14px 18px;color:#fff;font-weight:700;font-size:21px;line-height:1.35;max-width:380px}}
.ptr{{color:#ff6fd8;font-weight:700;font-size:20px;padding-left:120px}}
.bird{{font-size:18px}}
.right{{display:flex;flex-direction:column;gap:18px}}
.word{{font-size:15px;text-shadow:0 0 22px rgba(255,111,216,.5)}}
.for{{font-family:-apple-system,"Helvetica Neue",sans-serif;font-size:40px;font-weight:800;color:#fff;letter-spacing:-.5px}}
.sub{{font-family:-apple-system,"Helvetica Neue",sans-serif;font-size:22px;color:#d9c3d3;line-height:1.4;max-width:600px}}
.cmd{{font-size:17px;color:#e8e3ea;background:#140f16;border:1.5px solid #3a2a36;border-radius:10px;padding:10px 14px;align-self:flex-start}}
.cmd b{{color:#ff6fd8}}
</style></head><body>
<div class="left">
 <div class="bubble">Darling, your code called.<br>It wants a second opinion.</div>
 <div class="ptr">\\</div>
 <pre class="bird pink">{html.escape(BODY)}</pre>
</div>
<div class="right">
 <pre class="word pink">{html.escape(WORD)}</pre>
 <div class="for">for Claude Code</div>
 <div class="sub">A sassy flamingo that gives Claude a face and roasts you while you code.</div>
 <div class="cmd"><b>&gt;</b> /plugin install pet --marketplace graugart/flingo</div>
</div>
</body></html>'''

src = os.path.join(TMP, 'social.html')
open(src, 'w').write(page)
out = os.path.join(HERE, 'social-preview.png')
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                '--window-size=1280,640', f'--screenshot={out}', 'file://' + src], check=True, capture_output=True)
print(out, os.path.getsize(out))
