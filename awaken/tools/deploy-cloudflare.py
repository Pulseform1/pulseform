# Uploads Awaken to the "awaken" Cloudflare Worker through the API (for environments where wrangler can't upload assets).
# The static files are bundled into the Worker as modules next to server/api.js; secrets already on the Worker
# (VAPID_PRIVATE_JWK) are kept. usage: python3 tools/deploy-cloudflare.py   (from awaken/, with API access to Cloudflare)
import json, os, subprocess, sys, tempfile
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ACC = os.environ.get('CF_ACCOUNT', '1e8b621c0a860337000e8e3a16a41d61')
NAME = os.environ.get('CF_WORKER', 'awaken')
VAPID_PUBLIC = 'BPuOU0C4wX9XPLTc4ECAIUup39VMKJRC_65Dc4Aehss1FIFv8vjiQjJhutaf4PQACeqWJXUZXaNDDrAGi075oxs'
TXT = {'.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json'}
BIN = {'.png': 'image/png', '.apk': 'application/vnd.android.package-archive'}
FILES = ['index.html', 'sprites.js', 'privacy.html', 'manifest.webmanifest', 'sw.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
         'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/shortcuts/quest.png', 'icons/shortcuts/run.png', 'icons/shortcuts/recover.png',
         'icons/shortcuts/gates.png', 'widgets/quest-template.json', 'widgets/quest-data.json', 'widgets/screenshot.png', 'share/preview.png', 'awaken.apk']
FILES = [f for f in FILES if os.path.exists(os.path.join(APP, f))]
tmp = tempfile.mkdtemp()
imports, table, args = [], [], []
for i, f in enumerate(FILES):
    ext = os.path.splitext(f)[1]; binary = ext in BIN; mod = f'm{i}.' + ('bin' if binary else 'txt')
    imports.append(f"import f{i} from './{mod}';")
    cache = 'no-cache' if ext in ('.html', '.webmanifest', '.js', '.json') else 'public, max-age=604800'
    extra = ", 'attachment; filename=\"awaken.apk\"'" if ext == '.apk' else ''
    for k in ['/' + f] + (['/'] if f == 'index.html' else []):
        table.append(f"  {json.dumps(k)}: [f{i}, {json.dumps((BIN if binary else TXT)[ext])}, {json.dumps(cache)}{extra}],")
    args += ['-F', f"{mod}=@{os.path.join(APP, f)};filename={mod};type={'application/octet-stream' if binary else 'text/plain'}"]
worker = '\n'.join(['// Serves the Awaken web app (files bundled as modules) and its API.', "import { handleApi, runReminders, Store } from './api.js';", *imports, '',
  'export { Store };', 'const FILES = {', *table, '};', '', '''const SEC = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) return handleApi(request, env);
    const file = FILES[pathname];
    if (!file) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', ...SEC } });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    const [body, type, cache, disp] = file;
    const headers = { 'content-type': type, 'cache-control': cache, ...SEC };
    if (disp) headers['content-disposition'] = disp;
    return new Response(request.method === 'HEAD' ? null : body, { headers });
  },
  scheduled(event, env, ctx) { ctx.waitUntil(runReminders(env)); },
};
'''])
open(os.path.join(tmp, 'worker.js'), 'w').write(worker)
meta = {'main_module': 'worker.js', 'compatibility_date': '2026-10-01', 'keep_bindings': ['secret_text'],
        'bindings': [{'type': 'durable_object_namespace', 'name': 'STORE', 'class_name': 'Store'},
                     {'type': 'plain_text', 'name': 'VAPID_PUBLIC', 'text': VAPID_PUBLIC},
                     {'type': 'plain_text', 'name': 'VAPID_SUBJECT', 'text': 'https://awaken.philip-realivasquez.workers.dev'}]}
open(os.path.join(tmp, 'meta.json'), 'w').write(json.dumps(meta))
args = ['-F', f"metadata=@{tmp}/meta.json;type=application/json", '-F', f"worker.js=@{tmp}/worker.js;filename=worker.js;type=application/javascript+module",
        '-F', f"api.js=@{APP}/server/api.js;filename=api.js;type=application/javascript+module"] + args
r = json.loads(subprocess.run(['curl', '-sS', '-X', 'PUT', f'https://api.cloudflare.com/client/v4/accounts/{ACC}/workers/scripts/{NAME}', *args], capture_output=True, text=True).stdout or '{}')
print('upload', r.get('success'), r.get('errors'), len(FILES), 'files')
s = json.loads(subprocess.run(['curl', '-sS', '-X', 'PUT', f'https://api.cloudflare.com/client/v4/accounts/{ACC}/workers/scripts/{NAME}/schedules', '-H', 'content-type: application/json', '--data', json.dumps([{'cron': '*/15 * * * *'}])], capture_output=True, text=True).stdout)
print('schedules', s.get('success'), s.get('errors'))
if not r.get('success'): sys.exit(1)
