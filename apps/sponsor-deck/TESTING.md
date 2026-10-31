# Verification record

Verified October 31, 2026, in the Codex in-app Chromium browser against local HTTP hosting. No real personal data was used.

## Passed

- All 72 card IDs and questions are unique. Eight topical categories have six cards each; all 12 Steps have two cards each. Every card has a follow-up question.
- JavaScript syntax checks and the included `node tools/verify.mjs` release checks pass.
- Topic filtering, individual Step selection, and propagation of that selection into session setup work. Step 9 correctly offers two cards and caps a longer session at those two.
- Six consecutive honesty draws visited six unique cards before reshuffling.
- Keyboard activation of the favorite button works. Favorites survive page reload and appear in the Favorites view.
- Saved sessions support forward/back navigation, per-card note retention, page-reload restoration, completion, and review.
- A saved note containing HTML markup remained literal text in both the note field and review; no injected image element appeared.
- Exported JSON contained the saved favorite, completed session, and saved note. A temporary session and its unsaved note were excluded.
- Import showed a merge preview. Reimporting the same backup preserved the existing session without duplicating it. A backup with an unknown card ID was rejected.
- A session without saving disappeared after reload and did not enter session history. This also worked offline.
- The app ran at both an origin root and a nested `/sponsor-deck/` path. Every runtime asset, manifest, and icon returned HTTP 200 and the offline-ready message appeared.
- With the HTTP server completely stopped, the nested app reloaded, drew another card, and started/navigated a session with notes. This verifies service-worker offline use, rather than merely keeping an already-loaded page open.
- Phone, tablet, and desktop layouts were inspected. A narrow navigation overflow was corrected; both the deck and active session had matching viewport/content widths at 291 CSS pixels. Tablet layout also had no horizontal page overflow. The topic strip scrolls independently on phones.
- Visible labels, accessible control names, pressed favorite/topic state, progress semantics, modal dialogs, keyboard activation, skip link, and focus movement were inspected. CSS includes reduced-motion and increased-contrast preferences.
- Manifest icon paths and PNG dimensions pass validation. Original standard, maskable, Apple touch, and SVG icons are present.
- Final release ZIP contents and CRC integrity were checked after packaging.

## Verification limits

Actual installation on physical iOS/Android devices, VoiceOver/TalkBack sessions, private-browsing behavior, browser storage quota exhaustion, service-worker upgrades between future releases, and a live GitHub Pages deployment were not performed. Installation assets and manifest were validated; browser-specific install flows should be checked after deployment. Accessibility inspection is not a formal WCAG certification.

## Repeat before a future release

1. Run `node tools/verify.mjs` (optional Node 18+; no packages needed).
2. Serve over local HTTP or HTTPS. Confirm the offline-ready message, then reload with the server/network unavailable.
3. Draw through an entire topic and confirm no repeated card before the cycle completes.
4. Favorite a card and reload. Check empty and populated Favorites views.
5. Start both temporary and saved sessions; enter dummy notes, move backward/forward, reload, and finish. Verify temporary notes never appear in exports.
6. Export and import a dummy backup. Check cancellation, duplicate handling, unknown IDs, malformed JSON, oversized files, and safe rendering of notes containing markup.
7. On a disposable test browser profile, verify delete/clear confirmations and their final effects.
8. Check phone, tablet, desktop, keyboard-only navigation, screen reader output, reduced motion, and zoom. Install on actual target devices.
9. Update the service-worker version when changing assets, deploy together, and test the waiting-update behavior with a saved draft.

Do not use real recovery notes during acceptance testing.
