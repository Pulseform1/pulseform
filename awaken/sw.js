/* Awaken offline cache and Windows widget. Bump VERSION whenever the app files change. */
const VERSION = 'awaken-v9';
const FONTS = 'awaken-fonts';
const WIDGET_CACHE = 'awaken-widget'; // the page writes the widget's data snapshot here; it must survive updates
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './icons/shortcuts/quest.png', './icons/shortcuts/run.png', './icons/shortcuts/recover.png', './icons/shortcuts/gates.png',
  './widgets/quest-template.json', './widgets/quest-data.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS && k !== WIDGET_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(refreshOutside)
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the reminder and cloud save API is always live, and the APK download isn't worth caching
  if (url.origin === location.origin && (url.pathname.startsWith(new URL(SCOPE).pathname + 'api/') || url.pathname.endsWith('.apk'))) return;

  // Widget data: the page's latest snapshot, or the static default before the app has run.
  if (url.href === SNAPSHOT_URL) {
    e.respondWith(caches.open(WIDGET_CACHE).then(c => c.match(SNAPSHOT_URL))
      .then(hit => hit || caches.match(SNAPSHOT_URL, { cacheName: VERSION })).then(hit => hit || fetch(req)));
    return;
  }

  // App pages: try the network first so updates arrive, fall back to the cached copy offline.
  if (req.mode === 'navigate') {
    // only the app page itself is stored as index.html; other pages (privacy) are cached under their own URL
    const isApp = url.origin === location.origin && (url.pathname === new URL(SCOPE).pathname || url.pathname.endsWith('/index.html'));
    e.respondWith(
      fetch(req)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(isApp ? './index.html' : req, copy)); } return res; })
        .catch(() => isApp ? caches.match('./index.html') : caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Other app files: cache first.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Google Fonts: serve from cache, refresh in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

/* ---------- Windows 11 Widgets Board (Microsoft Edge only; a no-op everywhere else) ---------- */
const WIDGET_TAG = 'daily-quest';
const SCOPE = self.registration.scope;
const TEMPLATE_URL = new URL('widgets/quest-template.json', SCOPE).href;
const SNAPSHOT_URL = new URL('widgets/quest-data.json', SCOPE).href;

// The app's day starts at its reset hour, so "today" here must match the page's day key.
function dayKey(resetHour) {
  const d = new Date(Date.now() - (resetHour || 0) * 3600000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function readSnapshot() {
  let data = {};
  try {
    const hit = await (await caches.open(WIDGET_CACHE)).match(SNAPSHOT_URL)
      || await caches.match(SNAPSHOT_URL, { cacheName: VERSION });
    data = await (hit || await fetch(SNAPSHOT_URL)).json();
  } catch (e) {}
  // Last written on an earlier day: show a fresh quest instead of yesterday's numbers.
  if (data.date && data.date !== dayKey(data.resetHour)) {
    const today = dayKey(data.resetHour), [y, m, d] = today.split('-').map(Number);
    const rest = (data.restDays || []).includes(new Date(y, m - 1, d).getDay());
    data = Object.assign({}, data, {
      date: today, cleared: false, stale: true, left: (data.goals || []).length,
      // a joint that hurt yesterday is probably still flagged, so keep that day penalty-free too
      optional: rest || !!data.heal,
      status: 'New day. Open Awaken for today\'s Daily Quest.',
      goals: (data.goals || []).map(g => Object.assign({}, g, { done: false, mark: '○', progress: g.target })),
    });
  }
  return data;
}

async function widgetPayload(data) {
  const hit = await caches.match(TEMPLATE_URL);
  const template = await (hit || await fetch(TEMPLATE_URL)).text();
  return { template, data: JSON.stringify(data) };
}

async function renderWidgets(data) {
  if (!self.widgets) return;
  try {
    if (!(await self.widgets.getByTag(WIDGET_TAG))) return;
    await self.widgets.updateByTag(WIDGET_TAG, await widgetPayload(data || await readSnapshot()));
  } catch (e) {}
}

// Re-render the widget and the icon badge from the latest snapshot (also used by periodic sync on a new day).
async function refreshOutside() {
  const data = await readSnapshot();
  await renderWidgets(data);
  if (data.stale && self.navigator && 'setAppBadge' in self.navigator && data.badge !== false && !data.optional && data.left) {
    try { await self.navigator.setAppBadge(data.left); } catch (e) {}
  }
}

self.addEventListener('widgetinstall', event => {
  event.waitUntil((async () => {
    const payload = await widgetPayload(await readSnapshot());
    try { await self.widgets.updateByInstanceId(event.instanceId, payload); }
    catch (e) { try { await self.widgets.updateByTag(WIDGET_TAG, payload); } catch (e2) {} }
  })());
});

self.addEventListener('widgetresume', event => event.waitUntil(renderWidgets()));

self.addEventListener('widgetclick', event => {
  const routes = { quest: './?go=quest', recover: './?go=recover', run: './?go=run' };
  if (routes[event.action]) event.waitUntil(openApp(routes[event.action]));
});

async function openApp(path) {
  const target = new URL(path, SCOPE).href;
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of wins) {
    try { await c.focus(); c.postMessage({ type: 'awaken:nav', url: target }); return; } catch (e) {}
  }
  await self.clients.openWindow(target);
}

self.addEventListener('periodicsync', event => {
  if (event.tag === 'awaken-refresh') event.waitUntil(refreshOutside());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'widgets-refresh') event.waitUntil(renderWidgets());
});

/* ---------- daily reminder (web push without a payload: the message comes from the app's own snapshot) ---------- */
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    const d = await readSnapshot();
    const left = d.left || (d.goals || []).filter(g => !g.done).length;
    const title = d.cleared ? 'Daily Quest complete' : 'Daily Quest';
    const body = d.cleared ? 'You already cleared today\'s quest. Rest well, Player.'
      : left ? `[${left} goal${left > 1 ? 's' : ''} left before the reset.] Failure will result in an appropriate penalty.`
      : '[The Daily Quest resets soon.] Open Awaken to clear it.';
    await self.registration.showNotification(title, { body, tag: 'awaken-reminder', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { go: 'quest' } });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(openApp('./?go=' + ((event.notification.data && event.notification.data.go) || 'quest')));
});
