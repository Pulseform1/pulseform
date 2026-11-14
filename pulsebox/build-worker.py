"""Build the Pulsebox site for Cloudflare: static assets in dist/ plus a small Worker (worker.js) for /api/.

Why it is split this way: Cloudflare serves files in dist/ (the hub, bugs page, games/*.html and media/) straight from
its edge WITHOUT running the Worker. Those requests are free, unlimited and never count toward the Workers daily request
limit, so a flood of page or video requests can't take the site down. Only /api/ (cloud saves, play stats, multiplayer
rooms, THE HOLLOW and AFTERHOURS co-op, bug reports) runs the Worker, and there every visitor is rate limited per IP
(API_LIMIT in wrangler.toml) before any Durable Object is touched.

Security and cache headers for the static files live in dist/_headers (written below).
Media links get ?v=<content hash> so browsers fetch a cover or trailer again only when that file changes.

EMERGENCY MODE: `python3 build-worker.py --embedded` builds the old all-in-one Worker instead (pages embedded in worker.js,
media proxied from jsDelivr) plus wrangler.embedded.toml without the [assets] block. Deploy it with
`npx wrangler deploy -c wrangler.embedded.toml`. Use it only when static assets can't be uploaded: every page view then
counts toward the Workers request limit again. Commit and push media/ first in this mode, so jsDelivr can see it.
"""
import glob, hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, 'public')
DIST = os.path.join(HERE, 'dist')

def digest(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()[:10]

media_dir = os.path.join(PUB, 'media')
media_version = {n: digest(os.path.join(media_dir, n)) for n in os.listdir(media_dir)}
too_big = [n for n in media_version if os.path.getsize(os.path.join(media_dir, n)) > 25 * 1024 * 1024]
assert not too_big, 'static assets must be under 25 MiB: %s' % too_big
version = lambda m: m.group(1) + '?v=' + media_version.get(m.group(2), '0')

pages = {}
for path in ['index.html', 'bugs.html', 'picks.html'] + sorted(os.path.relpath(p, PUB) for p in glob.glob(os.path.join(PUB, 'games', '*.html'))):
    pages[path] = open(os.path.join(PUB, path), encoding='utf-8').read()
# version the media links in the hub page, so browsers fetch new covers and trailers after each media change
pages['index.html'] = re.sub(r'(media/([\w.-]+\.(?:jpg|png|webp|mp4)))', version, pages['index.html'])
# and the arcade link in the AFTERHOURS game pages, for the same reason
for k in pages: pages[k] = re.sub(r'(media/((?:arcade|encore)\.html))\?', lambda m: version(m) + '&', pages[k])
# link games by their clean URL (games/x), which static assets serve directly; games/x.html would cost a redirect
pages['index.html'] = re.sub(r"file: '(games/[a-z0-9-]+)\.html'", r"file: '\1'", pages['index.html'])
# Games of the Day (public/featured.json, edited by hand) and when each game was first added (for the Just added carousel).
# The added dates come from git history; they're also kept in public/games-added.json so builds without history still know them.
featured = json.load(open(os.path.join(PUB, 'featured.json'))) if os.path.exists(os.path.join(PUB, 'featured.json')) else {}
added_file = os.path.join(PUB, 'games-added.json')
added = json.load(open(added_file)) if os.path.exists(added_file) else {}
for f in sorted(glob.glob(os.path.join(PUB, 'games', '*.html'))):
    gid = os.path.basename(f)[:-5]
    try:
        d = subprocess.run(['git', 'log', '--diff-filter=A', '--format=%cI', '--', os.path.relpath(f, HERE)], cwd=HERE, capture_output=True, text=True).stdout.split()
        if d: added[gid] = d[-1][:19]
    except Exception: pass
if added: open(added_file, 'w').write(json.dumps(dict(sorted(added.items())), indent=1) + '\n')
pages['index.html'] = pages['index.html'].replace('/*@featured*/null', json.dumps({k: v for k, v in featured.items() if not k.startswith('_')})).replace('/*@added*/null', json.dumps(added))
# the game ids from the hub's GAMES list, so /api/play only counts real games
games_src = pages['index.html'].split('const GAMES = [', 1)[1].split('const CATEGORIES', 1)[0]
game_ids = sorted(set(re.findall(r'''\n\s*id:\s*['"]([a-z0-9-]+)['"]''', games_src)))
assert game_ids, 'no game ids found in index.html'
# the Games of the Day admin page (picks.html) gets the game list: id, title, cover
glist = []
for m in re.finditer(r'''\n\s*id:\s*['"]([a-z0-9-]+)['"]''', games_src):
    chunk = games_src[m.end():m.end() + 900]
    t, c = re.search(r'''title:\s*(['"])(.*?)\1''', chunk), re.search(r'''cover:\s*['"]([^'"]+)['"]''', chunk)
    if t and c: glist.append({'id': m.group(1), 'title': t.group(2).replace("\\'", "'"), 'cover': c.group(1)})
pages['picks.html'] = pages['picks.html'].replace('/*@games*/null', json.dumps(sorted(glist, key=lambda g: g['title'].lower()), ensure_ascii=False))

shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(os.path.join(DIST, 'games'))
for path, body in pages.items():
    open(os.path.join(DIST, path), 'w', encoding='utf-8').write(body)
shutil.copytree(media_dir, os.path.join(DIST, 'media'))
open(os.path.join(DIST, '404.html'), 'w', encoding='utf-8').write(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found · Pulsebox</title>'
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d17;color:#e9ecf8;font:16px system-ui,sans-serif;text-align:center">'
    '<div><h1 style="font-size:42px;margin:0 0 8px">Nothing here</h1><p>That page isn\'t in the box.</p><p><a href="/" style="color:#d4ff3a">Back to Pulsebox</a></p></div>')
# security headers: no MIME sniffing, HTTPS only, no embedding on other sites (clickjacking), no full URLs leaked
open(os.path.join(DIST, '_headers'), 'w').write('''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: frame-ancestors 'self' https://pulseform.org https://*.pulseform.org
  X-Frame-Options: SAMEORIGIN
/*.html
  Cache-Control: no-cache
/
  Cache-Control: no-cache
/bugs.html
  Cache-Control: no-store
/picks.html
  Cache-Control: no-store
/media/*
  Cache-Control: public, max-age=604800
''')

src = '''// Generated by build-worker.py. Do not edit by hand.
// This Worker only runs for /api/ (see run_worker_first in wrangler.toml); everything else is a static asset in dist/.
import { api, Saves, Stats, Rooms, Bugs } from './api.js';
import { HollowRooms } from './hollow-rooms.js';
import { ArcadeRooms } from './arcade-rooms.js';
export { Saves, Stats, Rooms, Bugs, HollowRooms, ArcadeRooms };
const GAME_IDS = %s;

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    // one visitor (IP address) gets API_LIMIT requests a minute; past that they get a cheap 429 before any Durable Object runs
    if (env.API_LIMIT) {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      const { success } = await env.API_LIMIT.limit({ key: ip });
      if (!success) { console.log(JSON.stringify({ rateLimited: ip, path, country: request.cf && request.cf.country, asn: request.cf && request.cf.asn, ua: (request.headers.get('user-agent') || '').slice(0, 120) })); return new Response(JSON.stringify({ error: 'slow down' }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60', 'x-content-type-options': 'nosniff' } }); }
    }
    return api(request, env, ctx, GAME_IDS);
  }
};
''' % json.dumps(game_ids)
open(os.path.join(HERE, 'worker.js'), 'w', encoding='utf-8').write(src)
size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(DIST) for f in fs)
print('worker.js', len(src.encode()), 'bytes,', len(game_ids), 'game ids; dist/', len(pages), 'pages +', len(media_version), 'media,', round(size / 1048576, 1), 'MB')

if '--embedded' in sys.argv:
    REPO = 'Pulseform1/pulseform'
    MEDIA = {'.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.html': 'text/html; charset=utf-8'}
    sha = subprocess.check_output(['git', 'log', '-1', '--format=%H', '--', 'public/media'], cwd=HERE, text=True).strip()
    files = {'/' + k: v for k, v in pages.items()}
    files['/index.html'] = re.sub(r"file: '(games/[a-z0-9-]+)'", r"file: '\1.html'", files['/index.html'])
    for k in ['/index.html'] + [f for f in files if f.startswith('/games/')]:
        files[k] = re.sub(r'(media/[\w.-]+\.(?:jpg|png|webp|mp4|html))\?v=[0-9a-f]+', r'\1?v=' + sha[:8], files[k])
    media = {'/media/' + n: MEDIA[os.path.splitext(n)[1]] for n in sorted(os.listdir(media_dir))}
    src = '''// Generated by build-worker.py from public/. Do not edit by hand.
import { api, Saves, Stats, Rooms, Bugs } from './api.js';
import { HollowRooms } from './hollow-rooms.js';
import { ArcadeRooms } from './arcade-rooms.js';
export { Saves, Stats, Rooms, Bugs, HollowRooms, ArcadeRooms };
const GAME_IDS = %s;
const FILES = %s;
const MEDIA = %s;
const CDN = 'https://cdn.jsdelivr.net/gh/%s@%s/pulsebox/public';

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      if (env.API_LIMIT) {
        const ip = request.headers.get('cf-connecting-ip') || 'unknown', { success } = await env.API_LIMIT.limit({ key: ip });
        if (!success) console.log(JSON.stringify({ rateLimited: ip, path: new URL(request.url).pathname, country: request.cf && request.cf.country, asn: request.cf && request.cf.asn, ua: (request.headers.get('user-agent') || '').slice(0, 120) }));
        if (!success) return new Response(JSON.stringify({ error: 'slow down' }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60' } });
      }
      return api(request, env, ctx, GAME_IDS);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    let path = new URL(request.url).pathname;
    if (path === '/') path = '/index.html';
    const type = MEDIA[path];
    if (type) {
      const range = request.headers.get('range');
      // only successful media is cached for 30 days: a CDN hiccup (403/5xx) must not stick, so it is retried once and never cached
      const get = () => fetch(CDN + path, { headers: range ? { range } : {}, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 2592000, '300-599': 0 } } });
      let upstream = await get(); if (!upstream.ok && upstream.status !== 416) upstream = await get();
      if (!upstream.ok) return new Response('Media unavailable, try again shortly.', { status: 502 });
      const headers = { 'content-type': type, 'cache-control': 'public, max-age=604800', 'accept-ranges': 'bytes' };
      for (const h of ['content-length', 'content-range']) if (upstream.headers.has(h)) headers[h] = upstream.headers.get(h);
      return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers });
    }
    const body = FILES[path];
    if (body === undefined) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    // security headers: no MIME sniffing, HTTPS only, no embedding on other sites (clickjacking), no full URLs leaked
    return new Response(request.method === 'HEAD' ? null : body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': path === '/bugs.html' || path === '/picks.html' ? 'no-store' : 'no-cache',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "frame-ancestors 'self' https://pulseform.org https://*.pulseform.org", 'x-frame-options': 'SAMEORIGIN' } });
  }
};
''' % (json.dumps(game_ids), json.dumps(files, ensure_ascii=False), json.dumps(media), REPO, sha)
    open(os.path.join(HERE, 'worker.js'), 'w', encoding='utf-8').write(src)
    toml = open(os.path.join(HERE, 'wrangler.toml')).read()
    toml = re.sub(r'\n# Pages, games and media are static assets.*?\nhtml_handling = "[^"]*"\n', '\n', toml, flags=re.S)
    assert '[assets]' not in toml
    open(os.path.join(HERE, 'wrangler.embedded.toml'), 'w').write('# Generated by build-worker.py --embedded. Emergency deploys only.\n' + toml)
    print('EMERGENCY embedded build: worker.js', len(src.encode()), 'bytes, media pinned to', sha[:7], '-> npx wrangler deploy -c wrangler.embedded.toml')
