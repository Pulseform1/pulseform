"""Search engines: adds /robots.txt and /sitemap.xml to a built worker.js (run after build-worker.py, before deploying).
The sitemap lists the hub and every game in its GAMES list that the Worker serves openly (Elite games, private test pages,
the admin pages and the API are left out), at the address the request came to, so it is right on any domain.
  python3 tools/seo-worker.py [path/to/worker.js]"""
import sys
p = sys.argv[1] if len(sys.argv) > 1 else 'worker.js'
s = open(p, encoding='utf-8').read()
anchor = "  async page(request, path) {\n    if (path === '/') path = '/index.html';\n"
assert s.count(anchor) == 1, 'page() anchor not found'
add = anchor + r"""    if (path === '/robots.txt' || path === '/sitemap.xml') {
      const origin = new URL(request.url).origin, text = (body, type) => new Response(request.method === 'HEAD' ? null : body, { headers: { 'content-type': type + '; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' } });
      if (path === '/robots.txt') return text('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /elite/\nDisallow: /bugs.html\nDisallow: /picks.html\n\nSitemap: ' + origin + '/sitemap.xml\n', 'text/plain');
      const urls = [origin + '/'].concat(GAME_IDS.filter(id => FILES['/games/' + id + '.html'] !== undefined && !ELITE_IDS.includes(id)).map(id => origin + '/games/' + id + '.html'));
      return text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => '  <url><loc>' + u + '</loc></url>').join('\n') + '\n</urlset>\n', 'application/xml');
    }
"""
if '/sitemap.xml' not in s: s = s.replace(anchor, add)
open(p, 'w', encoding='utf-8').write(s); print('robots.txt and sitemap.xml added to', p)
