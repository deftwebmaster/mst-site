# Verification report

Verified October 30, 2026. Updated the same day after the bug-fix and design pass (see the end of this report).

## Browser checks

- Completed all eight prompts and verified all text on the review screen.
- Reloaded a draft and confirmed the entered text survived.
- Saved an inventory, reloaded, and confirmed it appeared in history.
- Confirmed an open amends item appeared, then marked it complete and verified the empty-open-items state.
- Downloaded an actual JSON backup and inspected it to confirm saved answers.
- Stopped the HTTP server, reloaded the app, and navigated successfully using the cached shell.
- Inspected mobile and desktop layouts. Desktop document width matched viewport width (no horizontal document overflow).

## Automated checks

`node tests/verify.cjs` passes using Node's built-in assertions and a mocked browser environment. Covers:

- Valid dates and rejection of impossible dates.
- HTML escaping of user-controlled text.
- Draft persistence and saved-entry editing without duplicate dates.
- Invalid JSON and duplicate-date import rejection.
- Import merging and both keep-current and replace-from-backup conflict choices.
- Entry deletion and clear-all handling.
- All service-worker precache files exist.
- Failed storage writes retain the current draft in memory.

JavaScript syntax checks passed for app.js and sw.js. All manifest assets are present.

## Limits

No live GitHub Pages deployment, physical iOS/Android installation, browser eviction endurance test, or formal accessibility audit was performed. Automated tests mock browser facilities; the browser checks above provide separate evidence for key real interactions. No personal inventory data is included in this project.

## Bug-fix and design pass

Checked in a Chromium browser at desktop width and a 375×812 phone viewport, in light and dark themes:

- Completed a full inventory: typed answers, used ⌘ + Enter to advance (focus moved into the next answer), jumped to an earlier prompt with a progress segment, reviewed (skipped prompts show as "Skipped"), saved, and saw the closing screen with the next action and the amends reminder.
- Loaded a draft dated two days earlier: the "Welcome back" prompt appeared, and "Make it tonight's" moved it to the current inventory date.
- Corrupted the saved journal: saving paused, the raw data stayed untouched in storage, and the recovery card appeared in Privacy & backup.
- Simulated a change from another tab: the Reload banner appeared and inputs stayed disabled after navigating to another page.
- Theme switcher: Dark, Light and Auto apply immediately and update the browser's theme color.
- Phone layout: no horizontal overflow, aligned bottom navigation icons, answer text at 17px (iOS doesn't zoom on focus).
- New text colors meet WCAG AA contrast (4.9:1 or higher) against their backgrounds in both themes.

Not verified: service-worker registration and the refresh prompt (the preview browser used here refuses service-worker scripts, both before and after these changes), the iOS share-sheet backup, and the iOS keyboard behavior. Test these on a real device after deploying.
