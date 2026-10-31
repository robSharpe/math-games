// Ritar PNG-ikoner från icons/icon.svg med Playwright (Chromium).
// Kör: node tools/make-icons.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }

const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await pw.chromium.launch();
const page = await browser.newPage();
async function render(size, file, { pad = 0, bg = 'transparent' } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - pad * 2;
  await page.setContent(`<html><body style="margin:0;background:${bg}"><div style="padding:${pad}px;width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await page.screenshot({ path: new URL(`../icons/${file}`, import.meta.url).pathname, omitBackground: bg === 'transparent' });
}
await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(180, 'apple-touch-icon.png', { bg: '#11699A' });
await render(512, 'icon-maskable-512.png', { pad: 52, bg: '#11699A' });
await browser.close();
console.log('Ikoner klara.');
