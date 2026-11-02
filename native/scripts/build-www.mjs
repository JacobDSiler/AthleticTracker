// Copies the web app (repo root) into native/www so Capacitor can wrap it. No bundler needed:
// Fueld is plain HTML + JS. Run: npm run build:www
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const www = resolve(here, '..', 'www');
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

const files = ['index.html', 'fd-data.js', 'fd-engine.js', 'fd-app.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
for (const f of files) {
  const src = resolve(root, f);
  if (!existsSync(src)) throw new Error('Missing required web file: ' + f);
  cpSync(src, resolve(www, f));
}
// sanity: every script the page loads must be in www
const html = readFileSync(resolve(www, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"/g)) if (!existsSync(resolve(www, m[1]))) throw new Error('index.html references ' + m[1] + ' which is not in www');
console.log('www built ->', www, '(' + files.length + ' files)');
