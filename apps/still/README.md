# Still — Daily Inventory

A calm, mobile-first Step 10 reflection app. Static HTML, CSS, and JavaScript. No installation, build tools, database, API keys, account, tracking, or external assets required.

## Deploy on GitHub Pages

1. Create a GitHub repository and upload **the contents of this folder** to the repository root. Ensure `index.html`, `app.js`, `style.css`, `sw.js`, the manifest, icons, and `.nojekyll` are all included. Do not upload only the ZIP or leave the app inside an extra enclosing folder.
2. In the repository's Pages settings, choose deployment from a branch, select your branch (usually `main`) and `/ (root)`, and save.
3. Open the HTTPS Pages address GitHub provides. Both a repository subpath (such as `/still/`) and a custom domain work because all app URLs are relative.
4. Open once online and wait for the offline-ready message. Use the browser's install or Add to Home Screen option. On iOS, use Safari → Share → Add to Home Screen.

No GitHub credentials or deployment were configured as part of this package. Pages hosting serves the app code; it does not receive inventory entries.

## Preview locally

From this folder, run `python3 -m http.server 8000`, then visit http://localhost:8000. Stop with Ctrl+C. Opening index.html directly with a file:// URL does not provide service-worker offline support. Production installation and offline caching need HTTPS; localhost is supported for development.

## Included features

- Eight optional guided prompts: resentment, fear, dishonesty, selfishness, harms/amends, gratitude, what went well, and next action.
- Local-date inventory with a 4am day rollover, so a reflection written after midnight counts for the evening it covers. Draft autosave, a "welcome back" prompt for unfinished drafts from an earlier day, review before saving, one saved entry per date with a replacement confirmation, and a closing screen that carries your next action into tomorrow.
- Tap any progress segment to jump between prompts. On a computer, the cursor moves straight into each answer and ⌘/Ctrl + Enter continues.
- Searchable history (by words, ISO date, or weekday/month name), read/edit/delete, open amends and completion status.
- JSON backup of saved entries and the current draft. Import validates the complete file before writing, previews entry counts, merges by date, lets you keep current entries or use backup entries, and optionally restores the draft.
- Light and dark themes (follows the device, or choose in Privacy & backup), system serif typography with no downloaded fonts, and inline SVG icons.
- Offline app shell with an in-app "new version ready" refresh prompt, PWA manifest, home-screen and Apple touch icons, responsive layout, visible keyboard focus, reduced-motion support, labeled fields, and confirmation dialogs.
- In the installed app on iOS, backups are saved through the share sheet (Save to Files), because download links are unreliable there.

## Privacy and recovery

Everything you type is stored in localStorage under `still.inventory.v1` and `still.draft.v1`. The theme choice is stored under `still.theme`. After the first save, the app asks the browser to keep its storage persistent. There is no sync, analytics, remote font, third-party script, or submission endpoint. Hosting providers can still log page requests and IP addresses.

**Storage and backups are readable plaintext, not encrypted.** Anyone with this browser profile may access them. Clearing site data, private browsing, device loss, and browser cleanup may erase them. Use a private device and keep regular backups in a secure location. Export before changing domains, browser profiles, or devices, since each origin has separate storage. Import after moving.

When storage cannot be written, the app warns and preserves the current session's text for export. If saved data exists but can't be read, the app never overwrites it: saving pauses, and Privacy & backup offers to download the raw unreadable data and then clear it so saving can resume.

Two tabs editing simultaneously are discouraged. A tab that detects a change from another tab shows a Reload banner and refuses to save until reloaded, on every page, so it can't overwrite newer changes. It is not a transactional multi-user system.

## Updating the app

Upload changed files to the same location. Whenever changing cached app assets, increment `CACHE` in `sw.js` (for example, `still-shell-v2`). Changing `sw.js` is what lets browsers notice the update. Open pages then show "A new version of Still is ready" with a Refresh button; the new version never takes over mid-reflection without that tap. Installed apps also check for updates whenever they return to the foreground. App code caches are separate from inventory storage; updating code does not erase entries. Export a backup before updates as a precaution.

## Verify

With Node.js available, run `node tests/verify.cjs`. No npm packages are needed. See TEST-REPORT.md for tested behavior and device-testing limits.

## Files

`index.html` — shell and navigation; `style.css` — responsive styling; `app.js` — guided inventory, local data, history and backup; `sw.js` — offline cache; `manifest.webmanifest`, `icon*` and `apple-touch-icon.png` — PWA identity; `.nojekyll` — Pages compatibility.

Still is an independent reflection tool, not affiliated with or endorsed by Alcoholics Anonymous. The prompts are original. It supports personal practice and sponsor conversations.
