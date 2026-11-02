// Run after `npx cap add android` (CI does this). Idempotent.
//  - versionCode / versionName from env (VERSION_CODE, VERSION_NAME) so every CI run is uploadable to Play
//  - release signing from android/app/release.keystore + env (KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)
//  - camera + notification permissions, and a notification icon
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const android = resolve(here, '..', 'android');
if (!existsSync(android)) throw new Error('native/android not found - run `npx cap add android` first');
const pkg = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8'));
const versionName = process.env.VERSION_NAME || pkg.version;
const versionCode = parseInt(process.env.VERSION_CODE || '1', 10);

// build.gradle
const gp = resolve(android, 'app', 'build.gradle');
let g = readFileSync(gp, 'utf8');
g = g.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`).replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
if (!g.includes('signingConfigs')) {
  const signing = `    // Release signing from CI secrets (see .github/workflows/build-android.yml).\n    signingConfigs {\n        release {\n            def ks = file('release.keystore')\n            if (ks.exists()) {\n                storeFile ks\n                storePassword System.getenv('KEYSTORE_PASSWORD')\n                keyAlias System.getenv('KEY_ALIAS')\n                keyPassword System.getenv('KEY_PASSWORD')\n            }\n        }\n    }\n`;
  if (!/\n\s*buildTypes\s*\{/.test(g)) throw new Error('buildTypes block not found in build.gradle');
  g = g.replace(/\n(\s*)buildTypes\s*\{/, (m) => '\n' + signing + m.slice(1));
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, `$1\n            if (file('release.keystore').exists()) signingConfig signingConfigs.release`);
}
writeFileSync(gp, g);

// manifest permissions
const mp = resolve(android, 'app', 'src', 'main', 'AndroidManifest.xml');
let m = readFileSync(mp, 'utf8');
for (const perm of ['android.permission.CAMERA', 'android.permission.POST_NOTIFICATIONS']) {
  if (!m.includes(perm)) m = m.replace('</manifest>', `    <uses-permission android:name="${perm}" />\n</manifest>`);
}
writeFileSync(mp, m);

// notification icon (white bolt on transparent)
const dr = resolve(android, 'app', 'src', 'main', 'res', 'drawable');
mkdirSync(dr, { recursive: true });
writeFileSync(resolve(dr, 'ic_stat_notify.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFF" android:pathData="M13.4,2 L6.7,13.2 H11 L9.6,22 L17.3,10 H12.9 L14.9,2 Z"/>
</vector>
`);
console.log(`patched android: versionCode=${versionCode} versionName=${versionName}`);
