# Daily Meetings — Dallas 24 Hour Club

Plain HTML, CSS, and JavaScript. No build tools or third-party runtime dependencies. Requires iOS 15.4 or later (or any current browser).

## Publish
Replace the contents of your existing meeting-schedule folder with these files, preserving the icons folder and schedule-scan.jpeg. Host at the same HTTPS address as before (for example, GitHub Pages). Attendance storage belongs to that browser/app and origin, so moving domains does not move records. Export a backup before moving or clearing data.

For local preview, run `python3 -m http.server 8000` inside this folder and open http://localhost:8000. Opening index.html directly as a file is not supported because it uses JavaScript modules.

### How updates reach phones
The app opens from its saved offline copy, so it starts instantly even on weak Wi-Fi. Each time it opens online (and at most every 30 minutes while open), it checks the hosted HTML, CSS, JS, and manifest files. If anything changed, it saves the new set all at once and shows “The schedule or app was updated. Reload.” Residents who don’t tap Reload get the new version the next time they open the app.

- Edits to `schedule.js`, `app.js`, `index.html`, `style.css`, `storage.js`, or the manifest need nothing extra.
- If you change `sw.js`, the icons, or `schedule-scan.jpeg`, also bump `VERSION` at the top of `sw.js`. Residents then see “An app update is ready. Load update.”

## Resident phases
- Phase One is the default for first visits and existing schedule users. There is no setup screen.
- Choose Change phase near the top, or Settings & app information → Change resident phase, to switch phases.
- Each phase sees its own requirement labels from the handout:
  - Phase One: Mandatory, Attend or be off property, Optional.
  - Phase Two: Mandatory (Monday Night House Meeting), Mandatory if on property (Ross Ave. Group Birthday Night, last Saturday of the month), and “Meeting, common area, or off property” for every other Club meeting.
- Phase Two adds weekly progress, attendance buttons, manual entries, records, and backups.
- Your phase is remembered separately from attendance under d24-resident-phase-v1. Returning to Phase One hides the tracker without deleting any entries.
- JSON backups contain attendance only. Restoring them never changes your resident phase.
- Sharing the app link shares neither your phase choice nor attendance records. Each device/browser stores its own information.

## Attendance
- Weeks run Monday through Sunday, using Dallas dates. Every meeting lasts 60 minutes.
- The weekly goal is set by `WEEKLY_GOAL` in schedule.js (currently 3). There is no cap on recorded attendance.
- Tap Mark attended for a scheduled meeting after it starts. Edit the record to add notes or change whether it counts. Renaming a Club entry doesn’t bring back its Mark attended button: the Club has one meeting per time slot, so only one Club entry is allowed per date and start time.
- Log an outside meeting with a group name, date, and start time; the venue/address is optional. Outside meetings count toward the weekly goal by default. You can also choose Dallas 24 Hour Club in the form for unscheduled Club meetings.
- The Monday Night House Meeting is mandatory for both phases and never counts toward the weekly goal.
- Past weeks show “Goal met” or “Goal missed.” My record → Week by week lists every week since your first entry.
- Meeting dates, names, and locations are copied into attendance records and are not rewritten when the schedule changes.
- Edits, removals, and undo actions preserve snapshots in the JSON backup. Undo buttons disappear after 10 seconds. This is a personal log, not tamper-proof or independently verified evidence.

## Records and backups
My record has three views: selected week, week by week, and all records. Each view can be printed or saved as a PDF, exported as CSV, or shared with staff. On a phone, Share with staff opens the share sheet with an HTML report and a text summary; on a computer it downloads the report.

Back up from Settings & app information in Phase Two. On a phone, the backup opens the share sheet. Choose Save to Files (or iCloud Drive). A reminder appears when there are unsaved changes and the last backup is more than 7 days old. Restore merges by record ID; a newer changed version wins, including removals. A safety backup downloads before importing. Backups from this version can contain outside meetings with no address; older copies of the app will reject them, so update every device first.

Attendance is saved to browser localStorage, and the app asks the browser to keep it permanently. On iPhone, Safari can erase a website’s storage if you don’t open the site for 7 days; Home Screen apps are exempt. Phase Two shows a reminder to add the app to the Home Screen when it’s opened in Safari. Safari and the Home Screen app have separate storage, so move records between them with a backup and restore.

Things to test on a real iPhone after publishing: the Backup and Share with staff share sheet, and Print / Save PDF from the Home Screen app.

## Schedule maintenance
Edit schedule.js for recurring schedule changes. Each meeting has a Phase One `rule`, a Phase Two `phase2` rule, and whether it `counts` toward the weekly goal. Confirm the handout’s current meeting details with staff.

## Files
index.html (interface), style.css (responsive and print styles), app.js (attendance and interaction), storage.js (backup validation and merge), schedule.js (Dallas dates, recurring meetings, requirement rules), sw.js (offline copy and update checks), manifest.webmanifest and icons (installation; `icon-any-*` are the rounded standard icons, `icon-192/512` are full-bleed maskable icons for Android and the iPhone home screen).
