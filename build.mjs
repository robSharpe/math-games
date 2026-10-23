// Bygger index.html (allt i en fil) och sw.js från src/.
// Kör: node build.mjs            → index.html + sw.js
//      node build.mjs --artifact <fil>  → även en variant utan <html>/<head>-skal
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const font = readFileSync(new URL('./src/fonts/fredoka-latin.woff2', import.meta.url)).toString('base64');
const css = read('./src/styles.css').replace('__FONT_DATA__', () => font);
const js = ['questions.js', 'game.js'].map((f) => read(`./src/${f}`)).join('\n');

const html = read('./src/index.html')
  .replace('/*__STYLES__*/', () => css)
  .replace('/*__SCRIPTS__*/', () => js);
writeFileSync(new URL('./index.html', import.meta.url), html);

const version = createHash('sha256').update(html).digest('hex').slice(0, 12);
writeFileSync(new URL('./sw.js', import.meta.url), read('./src/sw.js').replace('__VERSION__', () => version));
console.log(`index.html (${(html.length / 1024).toFixed(0)} kB), sw.js version ${version}`);

const i = process.argv.indexOf('--artifact');
if (i > 0 && process.argv[i + 1]) {
  const art = html
    .replace(/<!--pwa-->[\s\S]*?<!--\/pwa-->\n?/, '')
    .replace(/<!doctype html>\n?/i, '')
    .replace(/<\/?html[^>]*>\n?/g, '')
    .replace(/<\/?head>\n?/g, '')
    .replace(/<\/?body>\n?/g, '')
    .replace(/<meta charset[^>]*>\n?/, '')
    .replace(/<meta name="viewport"[^>]*>\n?/, '');
  writeFileSync(process.argv[i + 1], art);
  console.log(`artifact → ${process.argv[i + 1]}`);
}
