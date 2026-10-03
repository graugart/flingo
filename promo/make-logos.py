"""Renders five Flingo logo proposals (1080x1080) with headless Chrome. Wordmarks come from logo-words.json."""
import html, json, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(HERE, '.html')
os.makedirs(TMP, exist_ok=True)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
WORDS = json.load(open(os.path.join(HERE, 'logo-words.json')))

HEAD = r"""   .-----.
  /       \
 |  L   R  |___
 |     M   ____)
  \_______/   V"""

BODY = r"""         .-----.
        /       \
       |  L   R  |___
       |     M   ____)
        \_______/   V
           ))
          ((
           ))
       .--''''--.
     /  ~~~~~~~~  \
    |  ~~~~~~~~~~  |==>
     \.___    ___./
          |  |
          |  |
         _|  |_"""

CROWN = r"""   .:*~*:.
   |\/\/\/|"""


def face(art, eyes):
    l, m, r = eyes
    return art.replace('L', l, 1).replace('R', r, 1).replace('M', m, 1)


def pre(text, cls=''):
    return f'<pre class="{cls}">{html.escape(text)}</pre>'


BASE = '''*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;
 font-family:Menlo,"SF Mono",monospace;color:#ff6fd8;overflow:hidden}
pre{font-family:inherit;line-height:1.08;font-weight:700}
.pink{background:linear-gradient(180deg,#ffb3ec,#ff6fd8 45%,#d6339f);-webkit-background-clip:text;background-clip:text;color:transparent}
.tag{font-family:-apple-system,"Helvetica Neue",sans-serif;font-weight:700;letter-spacing:.32em;text-transform:uppercase;color:#f3d6ea;font-size:22px}
'''

LOGOS = [
    # 1. Neon block: big shadow wordmark, head on top
    ('neon-block', 'background:radial-gradient(circle at 50% 35%,#3b1131,#0b070c 70%)',
     '.h{font-size:30px}.w{font-size:30px;text-shadow:0 0 28px rgba(255,111,216,.55)}',
     pre(face(HEAD, '^.^'), 'h pink') + pre(WORDS['shadow'], 'w pink') + '<div class="tag">your code has a critic</div>'),
    # 2. Slant with the whole bird standing beside it
    ('slant-standing', 'background:#0d0b10',
     '.row{display:flex;align-items:flex-end;gap:36px}.b{font-size:22px}.w{font-size:34px;margin-bottom:40px}',
     '<div class="row">' + pre(face(BODY, '■.■'), 'b pink') + pre(WORDS['slant'], 'w pink') + '</div>'
     + '<div class="tag">sass mode: on</div>'),
    # 3. Royal: crowned head over the 3D wordmark, on hot pink
    ('royal', 'background:linear-gradient(160deg,#ff7ad9,#c21f86)',
     '.h,.w{color:#1a0614}.h{font-size:34px}.w{font-size:34px}.tag{color:#2a0a20}',
     pre(CROWN + '\n' + face(HEAD, '^.^'), 'h') + pre(WORDS['big'], 'w') + '<div class="tag">the critic in your terminal</div>'),
    # 4. Terminal app icon: a rounded window with prompt and compact wordmark
    ('terminal-badge', 'background:#120d14',
     '.card{width:760px;border-radius:44px;background:#0a080b;box-shadow:0 0 0 2px #3a2a36,0 40px 120px rgba(255,111,216,.25);padding:44px 54px;display:flex;flex-direction:column;gap:26px}'
     '.dots span{display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:10px}'
     '.p{font-size:30px;color:#e8e3ea}.p b{color:#ff6fd8}.h{font-size:34px}.w{font-size:56px;line-height:1.0}',
     '<div class="card"><div class="dots"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></div>'
     '<div class="p"><b>&gt;</b> /flingo roast</div>' + pre(face(HEAD, 'o.O'), 'h pink') + pre(WORDS['calvin'], 'w pink') + '</div>'),
    # 5. Sticker: sub-zero wordmark in a pink outlined badge with the head peeking over the edge
    ('sticker', 'background:radial-gradient(circle at 50% 50%,#2a0d24,#070508 75%)',
     '.badge{position:relative;border:6px solid #ff6fd8;border-radius:40px;padding:70px 46px 40px;margin-top:120px}'
     '.h{position:absolute;top:-196px;left:50%;transform:translateX(-50%);font-size:34px}'
     '.w{font-size:34px}',
     '<div class="badge">' + pre(face(HEAD, '♥.♥'), 'h pink') + pre(WORDS['doom'], 'w pink') + '</div>'
     + '<div class="tag">darling, your code called</div>'),
]

for i, (name, bg, css, body) in enumerate(LOGOS, 1):
    src = os.path.join(TMP, f'logo-{i}.html')
    open(src, 'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{BASE}body{{{bg}}}{css}</style></head><body>{body}</body></html>')
    out = os.path.join(HERE, f'logo-{i}-{name}.png')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                    '--window-size=1080,1080', f'--screenshot={out}', 'file://' + src], check=True, capture_output=True)
    print(out)
