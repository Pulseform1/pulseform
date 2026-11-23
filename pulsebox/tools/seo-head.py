"""Search engines: the hub page's head says the site is called Pulsebox (canonical address, Open Graph site name, and
WebSite structured data, which is what search engines use for the site name in results).
  python3 tools/seo-head.py [path/to/index.html]   (does nothing if it is already there)"""
import sys
p = sys.argv[1] if len(sys.argv) > 1 else 'public/index.html'
s = open(p, encoding='utf-8').read()
if 'application/ld+json' not in s:
    i = s.index('</title>') + len('</title>')
    tags = ('\n<link rel="canonical" href="https://box.pulseform.org/">'
            '\n<meta property="og:site_name" content="Pulsebox">'
            '\n<meta property="og:type" content="website">'
            '\n<meta property="og:url" content="https://box.pulseform.org/">'
            '\n<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Pulsebox","alternateName":["Pulse Box","Pulsebox Games"],"url":"https://box.pulseform.org/"}</script>')
    s = s[:i] + tags + s[i:]
    open(p, 'w', encoding='utf-8').write(s); print('added to', p)
else: print('already there:', p)
