import html, json, os, re, subprocess

OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.html'), exist_ok=True)
HERE = os.path.join(OUT, '.html')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

FLAMINGO = [
    r"         .-----.         ",
    r"        /       \        ",
    r"       |  L   R  |___    ",
    r"       |     M   ____)   ",
    r"        \_______/   V    ",
    r"           ))            ",
    r"          ((             ",
    r"           ))            ",
    r"       .--''''--.        ",
    r"     /  ~~~~~~~~  \      ",
    r"    |  ~~~~~~~~~~  |==>  ",
    r"     \.___    ___./      ",
    r"          |  |           ",
    r"          |  |   *sass*  ",
    r"         _|  |_          ",
]
WINGS = {9: r"  \\ /  ~~~~~~~~  \ //   ", 10: r"   \|  ~~~~~~~~~~  |/=>  "}
OUTFITS = {
    'crown': [r"          .:*~*:.        ", r"         |\/\/\/|        "],
    'tophat': [r"           ____          ", r"         _|____|_        "],
    'party': [r"             *           ", r"            /_\          "],
    'bow': [r"                         ", r"          >(@)<          "],
}

# quote, eyes (L M R), outfit, wings, mood, transcript lines
ITEMS = [
    ("data2? Darling, I've seen better names on a parking ticket.", "^.^", None, False, "sassy",
     ["> clean up the variable names in utils.js", "● Read(src/utils.js)", "  ⎿ Read 212 lines", "● Edit(src/utils.js)", "  ⎿ Renamed data2 → userProfile"]),
    ("Forty console.logs, honey. That's not debugging, that's a diary.", "■.■", None, False, "unimpressed",
     ["> why is the console so noisy?", "● Grep(\"console.log\")", "  ⎿ Found 40 matches in 9 files", "● Removing debug output..."]),
    ("Sweetie, that wasn't a bug. That was your for loop begging for therapy.", "o.O", None, False, "concerned",
     ["> the cart total is wrong again", "● Bash(npm test)", "  ⎿ ✗ 3 failing", "● Edit(src/cart.js)", "  ⎿ off-by-one in the loop, fixed"]),
    ("Third try and the tests pass. We bury the first two, babe.", "^o^", "party", False, "thriving",
     ["> run the tests", "● Bash(npm test)", "  ⎿ ✗ 2 failing", "● Bash(npm test)", "  ⎿ ✗ 1 failing", "● Bash(npm test)", "  ⎿ ✓ 42 passed"]),
    ("Pushing to main on a Friday? Bold, darling. Kiss your weekend goodbye.", "■.■", None, False, "dramatic",
     ["> ship it", "● Bash(git push origin main)", "  ⎿ main -> main", "  ⎿ Fri 17:58"]),
    ("I centered your div, honey. Frame it. It won't happen twice.", "^.^", "crown", False, "iconic",
     ["> center the login box", "● Edit(src/styles.css)", "  ⎿ display: grid;", "  ⎿ place-items: center;"]),
    ("Babe, your regex looks like my feathers after a hurricane.", "-.-", "tophat", False, "judging",
     ["> why doesn't the email check work?", "● Read(src/validate.js)", "  ⎿ /^([a-z0-9_\\.-]+)@([\\da-z\\.-]+)$/", "● Thinking..."]),
    ("17 TODOs, sweetie? That's not a backlog, that's a personality.", "o.o", "bow", False, "unbothered",
     ["> what's left before launch?", "● Grep(\"TODO\")", "  ⎿ Found 17 matches", "  ⎿ oldest: 2 years ago"]),
    ("Works on your machine? Then marry it, darling. I'll bring flowers.", "o.O", None, False, "over it",
     ["> it works locally??", "● Bash(docker compose up)", "  ⎿ Error: missing env DATABASE_URL", "● Reading .env.example..."]),
    ("Deployed and green, honey. You're welcome. Now fetch my shrimp.", "♥.♥", "crown", False, "in love",
     ["> deploy to production", "● Bash(npm run deploy)", "  ⎿ ✓ Build complete", "  ⎿ ✓ Live in 38s"]),
]


def sprite(eyes, outfit, wings):
    l, m, r = eyes[0], eyes[1], eyes[2]
    rows = [row.replace('L', l, 1).replace('R', r, 1).replace('M', m, 1) for row in FLAMINGO]
    if wings:
        rows = [WINGS.get(i, row) for i, row in enumerate(rows)]
    return (OUTFITS[outfit] if outfit else []) + rows


def wrap(text, width):
    out, row = [], ''
    for word in text.split():
        nxt = f'{row} {word}' if row else word
        if len(nxt) <= width:
            row = nxt
        else:
            out.append(row)
            row = word
    if row:
        out.append(row)
    return out


TOOL = re.compile(r'^● (\w+)\((.*)\)$')


def line_html(ln):
    e = html.escape
    if ln == '':
        return '<div class="gap"></div>'
    if ln.startswith('>'):
        return f'<div class="t u">{e(ln)}</div>'
    if ln.startswith('✻'):
        return f'<div class="t spin">{e(ln)}</div>'
    m = TOOL.match(ln)
    if m:
        return f'<div class="t tool"><span class="dot">●</span> <b>{e(m.group(1))}</b>({e(m.group(2))})</div>'
    if ln.startswith('●'):
        return f'<div class="t say"><span class="wdot">●</span>{e(ln[1:])}</div>'
    if ln.startswith('  + '):
        return f'<div class="t add">{e(ln[2:])}</div>'
    if ln.startswith('  - '):
        return f'<div class="t del">{e(ln[2:])}</div>'
    return f'<div class="t r">{e(ln)}</div>'


def page(i, item):
    quote, eyes, outfit, wings, mood, lines = item
    bubble = wrap(quote, 28)
    bubble += [''] * (3 - len(bubble))
    rows = sprite(eyes, outfit, wings)
    parts, last = [], ''
    for ln in lines:
        # A wrapped line continues the prompt or prose above it.
        is_cont = ln.startswith('  ') and not ln.startswith(('  ⎿', '    ', '  + ', '  - '))
        if is_cont and last in ('u', 'say'):
            parts.append(f'<div class="t {last} cont">{html.escape(ln.strip())}</div>')
            continue
        parts.append(line_html(ln))
        last = 'u' if ln.startswith('>') else 'say' if ln.startswith('●') and not TOOL.match(ln) else ''
    transcript = ''.join(parts)
    bub = ''.join(f'<div>{html.escape(r) or "&nbsp;"}</div>' for r in bubble)
    spr = ''.join(f'<div>{html.escape(r)}</div>' for r in rows)
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:1080px;height:1350px;background:radial-gradient(circle at 30% 10%,#3a1430 0%,#120a14 55%,#09070b 100%);
 font-family:Menlo,"SF Mono",monospace;color:#e8e3ea;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px}}
.win{{width:1000px;height:870px;background:#0b0b0e;border-radius:22px;box-shadow:0 40px 120px rgba(255,80,190,.18),0 0 0 1px #2a2230;overflow:hidden;display:flex;flex-direction:column}}
.bar{{height:52px;background:#16131a;display:flex;align-items:center;padding:0 22px;gap:10px;color:#857c8c;font-size:17px}}
.dot{{width:14px;height:14px;border-radius:50%}}
.main{{flex:1;display:flex}}
.left{{width:440px;flex:none;padding:24px 22px 18px;font-size:15.5px;line-height:1.55;border-right:2px dashed #3a3340;white-space:pre-wrap;display:flex;flex-direction:column}}
.tx{{flex:1;overflow:hidden}}
.gap{{height:12px}}
.box{{border:1.5px solid #4a4250;border-radius:8px;padding:8px 12px;color:#e8e3ea;margin-top:12px}}
.box i{{display:inline-block;width:9px;height:17px;background:#e8e3ea;vertical-align:-3px;margin-left:2px}}
.hint{{color:#6f6676;font-size:13px;padding:6px 4px 0}}
.t.u{{color:#f5f0f7;background:#1d1a21;border-radius:4px;padding:2px 8px;margin:0 -8px}} .t.r{{color:#7f7686}} .t.say{{color:#e8e3ea}} .wdot{{color:#e8e3ea;margin-right:2px}} .t.tool{{color:#e8e3ea}} .t.tool b{{font-weight:700}} .dot{{color:#4ec97a}} .t.add{{color:#9be3b0;background:#12301e;padding-left:28px}} .t.del{{color:#f2a3a3;background:#3a1518;padding-left:28px}} .t.spin{{color:#e8925a}} .t.say.cont{{padding-left:18px}} .t.u.cont{{padding-left:24px}}
.right{{flex:1;background:#101014;padding:24px 26px;font-size:21px;line-height:1.24;white-space:pre}}
.bubble{{border:2.5px solid #ff6fd8;border-radius:16px;padding:14px 18px;color:#fff;font-size:26px;line-height:1.36;font-weight:600;white-space:normal}}
.bubble div{{white-space:pre}}
.ptr{{color:#ff6fd8;padding-left:120px;font-weight:700}}
.spr{{color:#ff6fd8;font-weight:700}}
.name{{margin-top:14px;font-weight:700;color:#fff}} .mood{{color:#8d8496}}
.cap{{text-align:center}}
.cap h1{{font-family:-apple-system,"Helvetica Neue",sans-serif;font-size:50px;font-weight:800;letter-spacing:-1px;color:#fff}}
.cap h1 b{{color:#ff6fd8}}
.cap p{{margin-top:12px;font-size:21px;color:#b8a9c2}}
</style></head><body>
<div class="win">
 <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span style="margin-left:14px">~/my-app · claude</span></div>
 <div class="main">
  <div class="left"><div class="tx">{transcript}</div><div class="box">&gt; <i></i></div><div class="hint">  ? for shortcuts</div></div>
  <div class="right"><div class="bubble">{bub}</div><div class="ptr">\\</div><div class="spr">{spr}</div><div class="name">  Flingo the flamingo</div><div class="mood">  feeling {html.escape(mood)}</div></div>
 </div>
</div>
<div class="cap"><h1>Your code has a <b>critic</b> now.</h1><p>Flingo roasts you while Claude Code works</p></div>
</body></html>'''


REPLIES = ['Renamed 14 variables. Tests still pass.', 'Removed 40 debug logs from 9 files.', 'Fixed the off-by-one. Cart totals are right again.', 'All 42 tests pass.', 'Pushed to main.', 'The login box is centered on every screen size.', 'Rewrote the email check as a readable function.', '17 TODOs found. 3 block the launch.', 'DATABASE_URL was missing from your .env. Added it.', 'Deployed to production. Everything is green.']

# Round two: the sick burns.
ITEMS += [
    ("You asked me to make it pop. Honey, the only thing popping is your stack.", "o.O", None, False, "overflowing",
     ["> make the homepage pop", "● Bash(npm run dev)", "  ⎿ RangeError: Maximum call stack size exceeded", "● Read(src/Hero.jsx)"]),
    ("'final final v3'? Darling, that's not version control. That's denial.", "-.-", "tophat", False, "unimpressed",
     ["> commit everything", "● Bash(git log --oneline -3)", "  ⎿ final final v3", "  ⎿ final final v2", "  ⎿ final FINAL"]),
    ("Third copy of the same Stack Overflow answer, sweetie. Just send the man flowers.", "^.^", "bow", False, "amused",
     ["> fix the date parsing", "● Grep(\"stackoverflow.com\")", "  ⎿ Found 3 matches", "  ⎿ same answer, 2014"]),
    ("A 400-line function, babe? That's not code. That's a hostage situation.", "o.O", None, False, "concerned",
     ["> refactor checkout()", "● Read(src/checkout.js)", "  ⎿ function checkout() {", "  ⎿ ... 400 lines ...", "  ⎿ }"]),
    ("You wrote 'quick fix' in 2023, honey. It's load-bearing now.", "■.■", None, False, "unbothered",
     ["> can we delete this hack?", "● Bash(git blame src/api.js)", "  ⎿ 2023-03-14  // quick fix, remove later", "● Grep(\"quickFix\")", "  ⎿ used in 31 places"]),
    ("Sweetie, naming everything temp doesn't make it temporary.", "-.-", None, False, "judging",
     ["> what does temp2 do?", "● Grep(\"temp\")", "  ⎿ temp, temp2, tempFinal,", "  ⎿ tempNew, temp_old_DONT_USE"]),
    ("if (password) is your security? Darling, I'm calling someone.", "o.O", "crown", False, "alarmed",
     ["> is the login secure?", "● Read(src/auth.js)", "  ⎿ if (password) {", "  ⎿   return true", "  ⎿ }"]),
    ("Twelve nested ifs, babe. My neck has fewer curves than this.", "■.■", None, False, "dramatic",
     ["> why is this so slow?", "● Read(src/rules.js)", "  ⎿ if (a) { if (b) { if (c) {", "  ⎿   if (d) { if (e) { if ("]),
    ("You blamed the cache again, honey. The cache has a lawyer now.", "^.^", "party", False, "petty",
     ["> it must be the cache", "● Bash(npm run clear-cache)", "  ⎿ Cache cleared", "● Bash(npm test)", "  ⎿ ✗ still failing"]),
    ("Three hours on a missing semicolon, darling. I need to lie down.", "-.-", "crown", False, "exhausted",
     ["> why won't it build", "● Bash(npm run build)", "  ⎿ SyntaxError: Unexpected token", "● Edit(src/index.js)", "  ⎿ added ;"]),
]
REPLIES += [
    'Found the infinite render loop in Hero.jsx. Fixed.',
    'Committed. Maybe a real message next time?',
    'Replaced three copies with one helper.',
    'Split checkout() into 9 small functions.',
    'The quick fix is now a real fix. With tests.',
    'Renamed 23 variables to things humans can read.',
    'Rewrote login with hashed passwords. Please rotate the old ones.',
    'Flattened the rules into a lookup table. 40x faster.',
    'It was not the cache. It was a typo in the config.',
    'Build passes. It was one semicolon.',
]
# Round three: fuller sessions.
REPLIES += ['', '', '', '', '', '', '', '', '', '']
ITEMS += [
    ("You asked for a small change and touched 47 files, honey. Small like your test coverage.", "o.O", None, False, "horrified",
     ["> tiny tweak: rename user to account", "", "● I'll rename it everywhere it appears.", "", "● Grep(\"user\")", "  ⎿ Found 312 matches in 47 files", "", "● Edit(src/models/user.ts)", "  - export class User {", "  + export class Account {", "", "● Bash(npm test)", "  ⎿ 3 tests, 3 passed", "", "● Renamed across 47 files. Only 3 tests", "  cover any of it.", "", "✻ Judging… (8s · esc to interrupt)"]),
    ("Darling, you pasted your API key into the prompt. In this economy?", "■.■", "crown", False, "scandalized",
     ["> why is this failing? key is", "  sk-live-4f9a... use that", "", "● Never paste live keys into chat. I'll", "  read it from the environment instead.", "", "● Edit(src/payments.ts)", "  - const key = \"sk-live-4f9a...\"", "  + const key = process.env.STRIPE_KEY", "", "● Rotate that key today. It has been", "  shared in plain text.", "", "✻ Clutching pearls… (3s)"]),
    ("A useEffect with no dependency array, sweetie? You live dangerously and render infinitely.", "o.O", None, False, "dizzy",
     ["> the page freezes after login", "", "● Read(src/Dashboard.tsx)", "  ⎿ Read 88 lines", "", "● Found it. This effect runs on every", "  render and sets state every time.", "", "● Edit(src/Dashboard.tsx)", "  - useEffect(() => { setUser(load()) })", "  + useEffect(() => { setUser(load()) }, [])", "", "● Bash(npm run dev)", "  ⎿ ✓ ready in 412ms"]),
    ("You said it's just CSS three hours ago, babe. CSS has won.", "-.-", None, False, "exhausted",
     ["> just make the footer stick to the bottom", "  it's just CSS", "", "● Edit(src/footer.css)", "  + position: sticky;", "  + bottom: 0;", "", "● Bash(npx playwright screenshot)", "  ⎿ footer floating mid-page", "", "● Edit(src/layout.css)", "  + min-height: 100dvh;", "  + display: flex; flex-direction: column;", "", "✻ Fighting z-index… (3h 2m)"]),
    ("Honey, fixed it as a commit message for the ninth time is a cry for help.", "-.-", "tophat", False, "concerned",
     ["> commit this", "", "● Bash(git log --oneline -9)", "  ⎿ a41f2 fixed it", "  ⎿ 9c0e1 fixed it", "  ⎿ 77b3d fixed it", "  ⎿ ... 6 more fixed it", "", "● Bash(git commit -m \"...\")", "  ⎿ [main 3e8a1] Fix race in session", "    refresh, add retry with backoff", "", "● Committed with a message future you", "  can actually read."]),
    ("You catch errors and log oops. Darling, that's not handling. That's journaling.", "^.^", "bow", False, "amused",
     ["> why do payments fail silently?", "", "● Grep(\"catch\")", "  ⎿ Found 14 matches", "", "● Read(src/checkout.ts)", "  ⎿ } catch (e) { console.log(\"oops\") }", "", "● Edit(src/checkout.ts)", "  - } catch (e) { console.log(\"oops\") }", "  + } catch (e) {", "  +   logger.error(\"charge failed\", e)", "  +   throw new PaymentError(e)", "  + }"]),
    ("Sweetie, your .env is in the repo. The whole internet says thank you.", "o.O", "crown", False, "alarmed",
     ["> clean up the repo before launch", "", "● Bash(git ls-files | grep env)", "  ⎿ .env", "  ⎿ .env.production", "", "● Those contain real secrets and they", "  are public on GitHub.", "", "● Bash(git rm --cached .env*)", "  ⎿ rm '.env'", "  ⎿ rm '.env.production'", "", "● Edit(.gitignore)", "  + .env*", "", "✻ Rotating every secret… (2m 14s)"]),
    ("You asked for dark mode, babe. Your code has been dark for years.", "■.■", None, False, "shady",
     ["> add dark mode", "", "● I'll add a theme toggle and dark", "  tokens.", "", "● Edit(src/theme.css)", "  + @media (prefers-color-scheme: dark) {", "  +   --bg: #0b0b0e;", "  +   --text: #e8e3ea;", "  + }", "", "● Bash(npm run build)", "  ⎿ ✓ built in 2.1s", "", "● Dark mode is live."]),
    ("A regex to parse HTML? Honey, I've seen horror movies with better endings.", "o.O", None, False, "spooked",
     ["> pull all links out of the page html", "", "● Read(src/scrape.js)", "  ⎿ /<a\\s+(?:[^>]*?\\s+)?href=([\"'])(.*?)\\1/g", "", "● That pattern breaks on nested tags", "  and unquoted attributes.", "", "● Edit(src/scrape.js)", "  - const links = html.match(LINK_RE)", "  + const doc = parse(html)", "  + const links = doc.querySelectorAll(\"a\")", "", "● Bash(npm test)", "  ⎿ ✓ 18 passed"]),
    ("You named the branch fix-everything, darling. Manifesting, I see.", "^o^", "party", False, "delighted",
     ["> make a branch for the release fixes", "", "● Bash(git checkout -b fix-everything)", "  ⎿ Switched to a new branch", "    'fix-everything'", "", "● Grep(\"FIXME\")", "  ⎿ Found 64 matches", "", "● Starting with the 6 that block", "  checkout.", "", "✻ Manifesting… (41s · esc to interrupt)"]),
]
ITEMS = [(q, e, o, w, m, lines + (['', '● ' + REPLIES[k]] if REPLIES[k] else [])) for k, (q, e, o, w, m, lines) in enumerate(ITEMS)]

for i, item in enumerate(ITEMS, 1):
    src = os.path.join(HERE, f'flingo-{i:02d}.html')
    open(src, 'w').write(page(i, item))
    out = os.path.join(OUT, f'flingo-{i:02d}.png')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                    '--window-size=1080,1350', f'--screenshot={out}', 'file://' + src],
                   check=True, capture_output=True)
    print(out)
