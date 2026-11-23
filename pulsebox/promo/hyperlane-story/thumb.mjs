// node thumb.mjs -> out/hyperlane-9x16.png and out/hyperlane-16x9.png
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 2700 } });
await p.goto("file://" + path.join(here, "thumb.html")); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.locator("#tall").screenshot({ path: path.join(here, "out", "hyperlane-9x16.png") });
await p.locator("#wide").screenshot({ path: path.join(here, "out", "hyperlane-16x9.png") });
await b.close();
