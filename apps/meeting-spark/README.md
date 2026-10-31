# Meeting Spark
A mobile-first, offline-capable, static AA meeting topic generator featuring 57 original topics (including the Twelve Traditions), guided discussion prompts, a swipeable card deck, category and style filtering, a share timer with a soft chime, used-topic tracking that keeps a topic out of rotation for four weeks, saved favorites, copy/share, and presentation mode.

## Deploy to GitHub Pages
1. Upload all files **in this folder** to a GitHub repository (root directory).
2. In GitHub **Settings → Pages**, set **Deploy from a branch**, select `main` and `/ (root)`, then save. (The `.claude` folder is only for local previews and doesn't need to be uploaded.)
3. Visit the published HTTPS URL. On iPhone, use Safari → Share → Add to Home Screen.

No backend, build tools, login, analytics, or dependencies. Topic titles use the Fraunces font, bundled in `fonts/` under the SIL Open Font License (`fonts/OFL.txt`), so the app makes no outside requests. The PWA service worker caches the application for offline use after the first successful visit; saved topics stay in your browser’s local storage.

All topics and prompts are original, not passages from copyrighted AA literature; this is an independent tool, not affiliated with or endorsed by AA. The app does not include official page references because editions and pagination vary.

To customize topic content, edit the `topics` array in `app.js`. Each entry contains title, category, style (`discussion`, `reflection` or `practical`), intro, and three prompts; add new topics at the end of the list so saved and used topics keep pointing at the right ones. Category names and colors live in `categories`. The Step and Tradition labels on cards come from each topic's position in the list (see the comment under `topics`), so keep the first thirteen topics and the Traditions block in order. The service worker serves from cache and refreshes it in the background, so a deploy reaches people on their second visit after it; bump `meeting-spark-v3` in `sw.js` if you add or rename files.
