#!/usr/bin/env node
// Uploads a signed AAB to Google Play with the Android Publisher API. No dependencies (Node 20+).
//
//   node scripts/play-upload.mjs <file.aab> [--track internal] [--status completed|draft] [--notes "text"]
//   node scripts/play-upload.mjs --check                 (verifies the service account can see the app; uploads nothing)
//
// Credentials: env PLAY_SA_JSON (the JSON itself, used by GitHub Actions) or --key <path to json>
// (default C:\dev\google-play-console-management\play-service-account.json when run on the PC).
// Settings: env PLAY_TRACK, PLAY_STATUS, PLAY_LANGUAGE (default en-GB), or the flags above.
// Idempotent: if Play already has this versionCode the script reports it and exits 0.
import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PKG = process.env.PLAY_PACKAGE || 'com.silertech.fueld';
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i > -1 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const aabPath = argv.find(a => a.endsWith('.aab'));
const check = !!flag('check', false);
const track = flag('track', process.env.PLAY_TRACK || 'internal');
let status = flag('status', process.env.PLAY_STATUS || 'completed');
const language = process.env.PLAY_LANGUAGE || 'en-GB';
const notes = String(flag('notes', process.env.RELEASE_NOTES || 'Latest build.')).slice(0, 480);
const keyPath = flag('key', process.env.PLAY_SA_PATH || 'C:\\dev\\google-play-console-management\\play-service-account.json');

const log = m => console.log('[play] ' + m);
const die = m => { console.error('[play] ERROR: ' + m); process.exit(1); };
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function loadKey() {
  const raw = process.env.PLAY_SA_JSON || (existsSync(keyPath) ? readFileSync(keyPath, 'utf8') : '');
  if (!raw) die('No service account: set PLAY_SA_JSON or put the key at ' + keyPath);
  try { return JSON.parse(raw); } catch { die('Service account JSON is not valid JSON'); }
}
async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3300 }));
  const sig = b64u(createSign('RSA-SHA256').update(head + '.' + body).sign(sa.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + body + '.' + sig }) });
  const j = await r.json();
  if (!j.access_token) die('Token request failed: ' + (j.error_description || j.error || r.status));
  return j.access_token;
}
const BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
async function api(token, method, url, body, headers = {}) {
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer ' + token, ...(body && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  if (!r.ok) { const e = new Error((j.error && j.error.message) || t.slice(0, 300) || r.status); e.status = r.status; throw e; }
  return j;
}
function gradleVersion() {
  try {
    const g = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
    return { code: (g.match(/versionCode\s+(\d+)/) || [])[1], name: (g.match(/versionName\s+"([^"]+)"/) || [])[1] };
  } catch { return {}; }
}

const sa = loadKey();
log(`service account ${sa.client_email} -> ${PKG}`);
const token = await accessToken(sa);

if (check) {
  try {
    const edit = await api(token, 'POST', BASE + '/edits', {});
    const tracks = await api(token, 'GET', `${BASE}/edits/${edit.id}/tracks`);
    await api(token, 'DELETE', `${BASE}/edits/${edit.id}`);
    log('OK - the service account can open edits for this app. Tracks: ' + ((tracks.tracks || []).map(t => t.track).join(', ') || '(none yet)'));
    process.exit(0);
  } catch (e) {
    die(`Cannot use ${PKG}: ${e.message}${e.status === 404 ? ' (app not created in Play Console yet, or the service account has not been granted access to it)' : e.status === 403 ? ' (grant the service account app permissions in Play Console -> Users and permissions; allow ~10 min)' : ''}`);
  }
}

if (!aabPath || !existsSync(aabPath)) die('Give the path to a signed .aab');
const aab = new Uint8Array(readFileSync(aabPath));
log(`uploading ${aabPath} (${(aab.length / 1048576).toFixed(1)} MB) to track "${track}", status "${status}"`);
const edit = await api(token, 'POST', BASE + '/edits', {});
let code;
try {
  const up = await api(token, 'POST', `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}/edits/${edit.id}/bundles?uploadType=media`, aab, { 'Content-Type': 'application/octet-stream' });
  code = Number(up.versionCode);
} catch (e) {
  if (/already been used|already used|duplicate|version code/i.test(e.message)) { log('Play already has this versionCode - nothing to do (bump versionCode in native/android/app/build.gradle for a new release).'); try { await api(token, 'DELETE', `${BASE}/edits/${edit.id}`); } catch {} process.exit(0); }
  die('Bundle upload failed: ' + e.message);
}
const v = gradleVersion();
const release = { name: `${code}${v.name ? ' (' + v.name + ')' : ''}`, versionCodes: [String(code)], status, releaseNotes: [{ language, text: notes }] };
async function setTrack() { await api(token, 'PUT', `${BASE}/edits/${edit.id}/tracks/${track}`, { track, releases: [release] }); }
try { await setTrack(); }
catch (e) {
  if (/draft/i.test(e.message) && status !== 'draft') { log('App is still a draft in Play Console - saving the release as a draft instead.'); status = release.status = 'draft'; await setTrack(); }
  else die('Setting the track failed: ' + e.message);
}
try { await api(token, 'POST', `${BASE}/edits/${edit.id}:commit`); }
catch (e) { die('Commit failed: ' + e.message + ' (if it mentions changes not sent for review, open Play Console -> Publishing overview)'); }
log(`DONE - versionCode ${code} is on the ${track} track (${status}).`);
