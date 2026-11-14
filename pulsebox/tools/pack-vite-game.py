# Inline the Vite build of Operation Ghost Town into one page for Pulsebox.
import re,sys,os,glob
src,out=sys.argv[1],sys.argv[2]
h=open(os.path.join(src,'index.html')).read()
css=open(glob.glob(os.path.join(src,'assets','*.css'))[0]).read()
js=open(glob.glob(os.path.join(src,'assets','*.js'))[0]).read().replace('</script','<\\/script')
h=re.sub(r'<link rel="stylesheet"[^>]*>','',h)
h=re.sub(r'<script type="module" crossorigin src="[^"]*"></script>','',h)
h=h.replace('content="width=device-width,initial-scale=1"','content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"')
h=h.replace('</head>','<style>'+css+'</style></head>')
h=h.replace('</body>','<script type="module">'+js+'</script></body>')
assert '<script type="module">' in h and 'assets/' not in h.split('<script type="module">')[0], 'pack failed'
open(out,'w').write(h); print(out,len(h))
