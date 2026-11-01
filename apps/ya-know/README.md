# Kevin’s “Ya Know” Counter

A vanilla JavaScript PWA with artwork extracted from the supplied mockup. No framework, build step, account, analytics, external fonts, or CDN required.

## Hosting
Upload index.html, style.css, app.js, sw.js, manifest.webmanifest, and the assets folder to an HTTPS host. Works at a subdirectory, including https://matt.st/apps/kevin-counter/ and GitHub Pages project paths. Preserve filenames and directory structure. GitHub Pages: commit these files and choose that branch/root in Settings → Pages.

For local testing run `npm run dev` and open http://localhost:4173. Opening index.html through file:// does not enable service workers or installation. Production requires HTTPS.

## Install
On iPhone, open the hosted URL in Safari → Share → Add to Home Screen. On Android use Chrome’s Install app menu (or the button in Settings when available). Visit online once before using offline.

## Behavior
- Tap the red button to count. Each click adds exactly one, including fast repeated taps.
- The layout fills exactly one phone screen (no scrolling); the tap button takes whatever space is left.
- Undo (the arrow beside Save) removes a count from the current meeting and all-time total.
- Save meeting records the count with its date on the leaderboard and resets to zero in one tap. A toast offers Undo for 6 seconds. Settings has Reset without saving for throwaway counts.
- Leaderboard ranks every saved meeting (ties share a rank) with Top and Most recent views, shows where the current meeting is on pace to land, and lets you delete a mistaken entry.
- Stats show lifetime count, best meeting, average per meeting, meetings saved, and the current rate. Rate uses elapsed wall-clock time since the first tap, including time with the app closed.
- Settings offer optional sound and vibration. iOS does not support the browser vibration API.
- Counts and preferences live in localStorage on this device and browser. They are not cloud synced. Clearing site data deletes them. JSON export is a backup for inspection; import is not implemented.
- Open one active counting tab at a time. Other tabs refresh when storage events arrive; simultaneous taps in separate tabs are not transactionally merged.
- Keyboard users can focus the tap button and press Space or Enter. Dialogs support Escape and contain keyboard focus.

## Updating
Change the CACHE version in sw.js whenever releasing updated assets or code. Reload after publishing updates. Only this app’s prefixed caches are removed.

## Source
All runtime code is plain JavaScript, CSS, and HTML. `preview.mjs` is a development-only Node static server. `package.json` is optional for hosting. Icons and brand/button artwork are derived from the user-provided concept image.
