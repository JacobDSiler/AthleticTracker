# Renaming the app

"Fueld" is already used by a UK AI meal-photo tracker (Bristol/Bath, on iOS + Android since July 2024) and has FUELD
trademark filings in the US (Class 5 supplements/sports nutrition). Decide on a new name before the first store listing.

The name lives in only these places:
1. `index.html`  - `<title>`, header text, `window.FD_APP_NAME` (the UI reads the name from this one variable)
2. `manifest.json` - `name`, `short_name`
3. `native/capacitor.config.json` - `appName` (and `appId` if you change the reverse-domain id; ids can never change after a store release)
4. `.github/workflows/build-*.yml` - output file names `Fueld-*.apk/aab/ipa`, iOS permission text
5. `CNAME` + DNS (Cloudflare) for the new subdomain
6. `sw.js` cache name, `scripts/fd-*` window titles (cosmetic)
Do it BEFORE creating the Play Console / App Store Connect records, because the applicationId / bundle id are permanent.
