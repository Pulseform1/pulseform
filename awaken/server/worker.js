// Entry point for `npx wrangler deploy`: /api/* goes to the server, everything else is the static app.
import { handleApi, runReminders, Store } from './api.js';

export { Store };
export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
  scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },
};
