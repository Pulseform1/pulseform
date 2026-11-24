// node thumbs/thumb.mjs <film> -> out/<film>-9x16.png and out/<film>-16x9.png (from thumbs/<film>.html)
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), film = process.argv[2] || "the-78th-game";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 2700 } });
await p.goto("file://" + path.join(here, `${film}.html`)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.locator("#tall").screenshot({ path: path.join(here, "..", "out", `${film}-9x16.png`) });
await p.locator("#wide").screenshot({ path: path.join(here, "..", "out", `${film}-16x9.png`) });
await b.close();
