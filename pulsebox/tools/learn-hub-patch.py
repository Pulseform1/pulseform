"""Adds the Educational Games category to the Pulsebox home page (public/index.html, or the file given): a banner under
the leaderboard band that opens games/learn.html, and an 'Educational' chip in the Jump to row. Nothing else changes.
Safe to run again (it does nothing if the banner is already there).  python3 tools/learn-hub-patch.py [path/to/index.html]"""
import os, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'public', 'index.html')
s = open(path, encoding='utf-8').read()
if 'id="eduBand"' in s:
    print('learn-hub-patch: already there'); sys.exit(0)

CSS = '''  .lb-band:focus-visible { outline: 3px solid #ffd65a; outline-offset: 4px; }
  /* EDUCATIONAL GAMES: a banner that opens the category page (games/learn.html) */
  .edu-band { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: clamp(14px, 3vw, 30px); margin: 0 0 clamp(16px, 2.2vw, 24px); padding: clamp(18px, 3vw, 30px) clamp(18px, 3.4vw, 36px);
    border-radius: 24px; text-decoration: none; color: var(--text); border: 1px solid rgba(41,224,255,.35); transition: transform .25s ease, box-shadow .25s ease;
    background: radial-gradient(70% 160% at 0% 50%, rgba(41,224,255,.24), transparent 60%), radial-gradient(60% 140% at 100% 0%, rgba(198,255,61,.16), transparent 60%), linear-gradient(120deg, #062430, #0b1420 55%, #0d1208); box-shadow: 0 0 0 1px rgba(41,224,255,.1) inset, 0 18px 50px rgba(0,0,0,.35); }
  .edu-band:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px rgba(41,224,255,.25) inset, 0 0 46px rgba(41,224,255,.25), 0 22px 60px rgba(0,0,0,.45); }
  .edu-band:focus-visible { outline: 3px solid #29e0ff; outline-offset: 4px; }
  .edu-cap { font-size: clamp(52px, 7.5vw, 86px); line-height: 1; filter: drop-shadow(0 0 22px rgba(41,224,255,.55)); animation: lbBob 3.4s ease-in-out infinite; }
  .edu-txt { min-width: 0; } .edu-txt .k { font-family: var(--display); font-weight: 700; font-size: 12px; letter-spacing: .3em; color: #29e0ff; text-transform: uppercase; }
  .edu-txt h2 { margin: 4px 0 6px; font-family: var(--display); font-size: clamp(26px, 5.4vw, 52px); line-height: .95; letter-spacing: .03em; text-transform: uppercase; background: linear-gradient(90deg, #e6fbff, #29e0ff 45%, #c6ff3d); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .edu-txt p { margin: 0; color: #cfe4ec; font-weight: 700; font-size: clamp(14px, 1.6vw, 17px); }
  .edu-subs { display: grid; grid-template-columns: repeat(2, auto); gap: 6px; }
  .edu-subs span { padding: 7px 11px; border-radius: 12px; background: rgba(0,0,0,.35); box-shadow: 0 0 0 1px rgba(41,224,255,.18) inset; font-weight: 800; font-size: 14px; white-space: nowrap; }
  .edu-subs .edu-go { grid-column: 1 / -1; text-align: center; border-radius: 12px; padding: 10px 16px; font-family: var(--display); font-weight: 700; font-size: 16px; letter-spacing: .08em; text-transform: uppercase; color: #04161c; background: linear-gradient(90deg, #29e0ff, #c6ff3d); }
  @media (max-width: 760px) { .edu-band { grid-template-columns: auto minmax(0, 1fr); } .edu-subs { grid-column: 1 / -1; } .edu-cap { font-size: 46px; } }
'''
HTML = '''<section class="lb-band" id="lbBand" role="button" tabindex="0" aria-labelledby="lbbTitle"></section>
    <a class="edu-band" id="eduBand" href="games/learn.html" aria-labelledby="eduTitle">
      <div class="edu-cap" aria-hidden="true">🎓</div>
      <div class="edu-txt"><div class="k">Educational games · free</div><h2 id="eduTitle">Learn by playing</h2><p>20 quick games for math, typing, spelling, grammar, flags, capitals, science, space, chemistry and logic.</p></div>
      <div class="edu-subs" aria-hidden="true"><span>🔢 Math · 5</span><span>📖 Language · 5</span><span>🌍 Geo &amp; Science · 5</span><span>🧠 Logic · 5</span><span class="edu-go">Explore ›</span></div>
    </a>'''
edits = [
    ('  .lb-band:focus-visible { outline: 3px solid #ffd65a; outline-offset: 4px; }\n', CSS),
    ('<section class="lb-band" id="lbBand" role="button" tabindex="0" aria-labelledby="lbbTitle"></section>', HTML),
    ("cats.push(['🆕', 'Newly added', 'shelf-newly', '#c6ff3d', newlyAdded().length], ['🗂️', 'All topics', 'finder', '#8d95ab', 0]);",
     "cats.push(['🆕', 'Newly added', 'shelf-newly', '#c6ff3d', newlyAdded().length], ['🎓', 'Educational', 'learn', '#29e0ff', 20], ['🗂️', 'All topics', 'finder', '#8d95ab', 0]);"),
    ("b.addEventListener('click', () => { if (query)", "b.addEventListener('click', () => { if (target === 'learn') { location.href = 'games/learn.html'; return; } if (query)"),
]
for a, b in edits:
    assert s.count(a) == 1, 'learn-hub-patch: anchor not found once: ' + a[:70]
    s = s.replace(a, b)
open(path, 'w', encoding='utf-8').write(s)
print('learn-hub-patch: Educational Games banner and chip added to', os.path.relpath(path))
