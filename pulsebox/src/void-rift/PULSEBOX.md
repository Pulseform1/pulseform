# Void Rift on Pulsebox

`public/games/void-rift.html` is `index.html` with `style.css` and `game.js` inlined:

```
python3 - <<'PY'
d='src/void-rift'; h=open(d+'/index.html').read()
h=h.replace('<link rel="stylesheet" href="style.css">','<style>'+open(d+'/style.css').read()+'</style>')
h=h.replace('<script src="game.js"></script>','<script>'+open(d+'/game.js').read().replace('</script','<\\/script')+'</script>')
open('public/games/void-rift.html','w').write(h.replace('<title>VOID RIFT — Neon Survival</title>','<title>Void Rift</title>'))
PY
```

Changes made for Pulsebox: nine upgrades (three offered at random each sector), a Splitter enemy, hit flashes, piercing
shots, a salvage magnet, score sent to the site's leaderboard, sound on by default (remembered), no keyboard hints on
touch screens, the menu fits shorter screens.
