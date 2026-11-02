# Fueld - build, push, deploy (CI/CD)

Live site: https://fueld.jacobsiler.com (GitHub Pages, branch `main`, repo root, `CNAME` already set).
Same pattern as Math Adventure / Our Kitchen: a tray watcher ticks a canary file -> push -> GitHub does the rest.

## The loop
```
you / Claude finish a change
   -> echo %date% %time% > deploy-tick.txt        (the "canary")
   -> tray watcher (orange-green "F") waits 8 s, runs scripts\fd-push.ps1:
        1. secret guard   2. engine unit tests (blocks the push if the calculator is broken)
        3. rebase if GitHub is ahead (never force-push)   4. commit + push main
   -> GitHub Pages republishes the website (1-2 min)
   -> GitHub Actions (on the same push):
        Tests          .github\workflows\ci.yml            every push
        Build Android  .github\workflows\build-android.yml debug APK always; signed AAB if secrets exist
        Build iOS      .github\workflows\build-ios.yml     simulator build always; signed IPA if secrets exist
```
Download the APK/IPA from the run's **Artifacts** section: https://github.com/JacobDSiler/AthleticTracker/actions

## Commands (repo root, double-click)
| File | Does |
|---|---|
| `build.cmd` | Runs the unit tests + builds `native\www`. Pushes nothing. |
| `push.cmd` | Tests -> commit -> push (same script the watcher runs). |
| `deploy.cmd` | `build.cmd` then `push.cmd`. |
| `release.cmd` [minor/major] | Bumps version, commits, tags `vX.Y.Z`, pushes. The **tag** is what ships to the stores. |
| `scripts\fd-start-watcher.cmd` | Starts the tray watcher and adds it to Windows startup. |
| `scripts\fd-stop-watcher.cmd` | Stops it. |

Tray colours: green idle - yellow change detected - blue pushing - red failed - gray paused.
Right-click: Push now, Pause, logs, open site. Logs: `logs\push.log`, `logs\watcher.log`.
Exit codes: 0 ok, 1 error, 2 secret-looking file blocked, 3 tests failed (`set FD_SKIP_TESTS=1` to bypass once).

## Native apps (Capacitor)
`native\` wraps the web app. The Android/iOS projects are **generated in CI** (`cap add`), so no Android Studio or Xcode is
needed and nothing platform-specific lives in git. App id: `com.silertech.fueld`. Icons/splash come from `native\resources`.
Version: tag `v1.2.3` -> versionName 1.2.3; versionCode = GitHub run number + 100 (always rises, so Play accepts every upload).

### One-time setup for signed store builds (repo -> Settings -> Secrets and variables -> Actions)
Android (same keystore approach as Our Kitchen - make a NEW keystore for Fueld, keep it backed up forever):
- secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
- Play upload: secret `PLAY_SERVICE_ACCOUNT_JSON` (contents of `C:\dev\google-play-console-management\play-service-account.json`),
  create the app `com.silertech.fueld` in Play Console, grant that service account access, upload the first AAB by hand.
  Then variables: `PLAY_TRACK=internal`, `PLAY_STATUS=draft` (until the listing is complete); optional `PLAY_AUTO_UPLOAD=true`
  to upload on every push instead of only on tags.
iOS (paid Apple Developer account):
- secrets: `ASC_KEY_P8_BASE64`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID` (App Store Connect API key)
- create the app record `com.silertech.fueld` in App Store Connect; optional variable `IOS_AUTO_UPLOAD=true`.
Until the secrets exist, CI still proves both projects build and gives you an installable debug APK.

## Local checks
`node --test test/engine.test.mjs` - 12 tests covering the calculators, routines, meal planner and shopping list.
