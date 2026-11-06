# StudyLog

**CJay's Study Tracker** — a lightweight, installable web app for tracking study topics through a four-stage learning workflow. Built by a PharmD student at the University of Benin for his own study routine, and useful for any student who wants to see exactly where each topic stands instead of just ticking boxes.

## What it is

StudyLog tracks topics through four stages — **Blind Recon, Deep Read, Blurt, and Anki Digitization** — so you always know which topics are untouched, in progress, or fully worked through. It runs entirely in the browser as a progressive web app (PWA): it works offline, saves changes locally, and can be installed on your phone's home screen.

## Features

### The four stages

- **Four-stage topic tracking** — each topic has four steps: Blind Recon, Deep Read, Blurt (labelled "Blurted" in the data layer), and Anki Digitization. Ticking a step records the date and time it was completed; unticking it clears that timestamp.
- **No enforced order** — any step can be ticked or unticked independently, in any order, from the checkboxes on a topic card or from the topic detail sheet. The app does not require Blind Recon before Deep Read, and so on.
- **Status is derived, not stored** — 0 steps done is **Not Started**, 1–3 done is **In Progress**, all 4 done is **Completed**. Each card shows the status pill, a progress bar, and a step count (e.g. 2/4).
- **Topic detail sheet** — tapping a card opens its detail view: progress bar, each step with its completion time shown as a relative time ("3h ago", "2d ago") or "Not yet", any notes, and Created / Updated relative times, plus Edit.

### Topics, subjects, and the list

- **Add / edit form** — Subject and Topic are both required; Notes is optional. Editing a topic (from its card menu or detail sheet) changes subject, topic, and notes and leaves its steps untouched.
- **Subjects with autocomplete** — subjects are colour-coded per topic: a colour is picked from a fixed 10-colour palette by hashing the subject name, so the same subject always gets the same colour. The add-topic form suggests up to 6 existing subjects containing what you typed (exact matches excluded).
- **Summary cards and filters** — at-a-glance totals for all topics, completed topics, and topics in progress. Tapping a summary card filters the list (tapping it again clears the filter); a filter chip shows the active filter and clears it. A fourth filter, Not Started, exists in the code but has no summary card.
- **Card menu** — each topic card has an overflow menu with Edit, Reset steps (clears all four steps and their timestamps), and Delete.

### Streaks, Calendar, History, and Reports

- **Study streak counter** — a flame chip in the header shows the current streak: consecutive days ending today (or yesterday, if nothing was done today yet) with at least one step completion. Streak days are counted from the UTC date of each completion timestamp.
- **Calendar view** — a month grid of study activity, with previous/next month navigation and a Today button. Days with at least one step completion show a count badge; only those days can be tapped, opening that day's completions with the time each step was done.
- **History view** — step completions from the **last 30 days only**, newest first, grouped by day (labelled Today / Yesterday / weekday + date). Filter chips narrow it to one subject, and tapping an entry opens that topic's detail sheet.
- **Reports view** — four tiles (current streak, longest streak, completed topics out of total, completion %), an **Activity** bar chart of completions per day switchable between 7-day and 30-day ranges, per-subject progress bars (completed/total with %), a **heatmap of the last 90 days** (shading levels: 1–2, 3–5, 6–9, 10+ completions per day), and a "Needs attention" list of stuck topics.
- **Stuck topics** — only topics still In Progress qualify, and only when their *earliest* completed step was more than 14 days ago; the list shows how many days have passed since that earliest step. (Note the quirk: it is the earliest step, not the most recent activity, that decides — a topic worked on yesterday still counts as stuck if it was first started over two weeks ago.)

### Search

- **Search** — a full-screen view that matches a query (case-insensitive substring) against subject, topic, and notes. Matching terms are highlighted in the topic and subject shown in each result, and tapping a result opens that topic's detail sheet.

### Settings and Tools

- **Settings** — dark mode and compact view toggles; data actions (Backup to file, Restore from file, Import from CSV, Export as CSV); Google Drive sync (see below); a Danger zone (Clear completed, Reset all data); and an About section showing the app version, read from the service worker's cache version.
- **Compact view** — hides progress bars and steps on topic cards. It is *not* remembered: it only toggles a class on the page, with no `localStorage` key, so it resets when the page reloads. Dark mode *is* remembered (`studylog.theme`).
- **Tools sheet** — a grid of tiles reached from the menu: Backup, Restore, Import CSV, Export CSV, **Print** (calls `window.print()`), Compact, and Clear Completed. (Reset all data is in Settings, not in Tools.)
- **Delete with undo** — deleting a topic asks for confirmation, then shows a toast with an **Undo** button for 5 seconds; undo restores the topic with its original id and data.
- **Clear completed / Reset all** — both are destructive and cannot be undone, and both require typing `DELETE` to confirm. Clear completed removes all fully-finished topics; Reset all permanently deletes every topic on the device.
- **Toast notifications** — in-app feedback for actions, at most 3 shown at once, normally auto-dismissing after 5 seconds (the update toast and the delete-undo toast are the exceptions).

### Backup, CSV, and restore

- **JSON backup and restore** — backup downloads `studylog-backup-YYYY-MM-DD.json` containing `{app: "studylog", schema: 1, exportedAt, topics}`. Restoring a JSON file (a bare topic array is also accepted) asks whether to **Replace everything** or **Merge with current**; merging overwrites topics with matching ids and adds the rest, reporting how many were added vs updated.
- **CSV export and import** — export downloads `studylog-YYYY-MM-DD.csv` with columns Subject, Topic, Status (the label, e.g. "In Progress"), Blind Recon, Deep Read, Blurted, Anki Digitized (true/false), Notes, Created, Updated. Import requires Subject and Topic columns; a step column counts as done only when its cell is literally `true` (case-insensitive), and completed steps take their timestamp from a "Last Updated" column if present, otherwise the import time. Imported rows get fresh ids, are appended to the existing data (never deduplicated), and rows missing a subject or topic are skipped.

### Google Drive sync

- **Google Drive sync** — optional manual push/pull backup to a folder named `StudyLog` in Drive, holding a single file, `studylog.json`, with the same JSON payload as a local backup. It uses the user's own Google OAuth Client ID, entered in Settings and stored locally (`cjay_gdrive_client_id`); the last sync time is stored under `studylog_last_sync` and shown as a relative time in Settings.
- **How it works** — the page loads the Google API client script (`apis.google.com/js/api.js`, `gapi`) and Google Identity Services (`accounts.google.com/gsi/client`). On first use the app waits up to 12 seconds for both libraries, loads the Drive v3 client (`gapi.load('client')` with the Drive v3 discovery document), and creates a GIS token client with scope `https://www.googleapis.com/auth/drive.file`. **Connect** requests an access token with a consent prompt; Push/Pull reuse the in-memory token (it is never stored). Push creates the `StudyLog` folder if needed and creates or updates `studylog.json` (multipart upload). Pull downloads the file and offers the same Replace / Merge choice as local restore. The built-in help sheet explains creating a Web-application OAuth Client ID in Google Cloud Console and adding the GitHub Pages URL (and `http://localhost`) as an authorized JavaScript origin.
- **Sync is manual only** — there is no automatic or background sync; nothing is pushed or pulled unless you tap Push, Pull, or Connect.

### Offline and install

- **Offline support** — an offline banner ("You're offline — changes will still save locally") appears when the connection drops, driven by the browser's online/offline events; changes still save to `localStorage`.
- **Service worker** — `sw.js` (cache `studylog-v1.1.2`) precaches the app shell (`index.html`, `styles.css`, `storage.js`, `app.js`, `manifest.json`, `icon.svg`) plus the Google Fonts stylesheet and Font Awesome CSS, serves cached responses while refreshing them in the background (stale-while-revalidate), caches other successful GET responses as they are fetched, and falls back to the cached `index.html` for navigation while offline. Google API/identity requests (`googleapis.com`, `accounts.google.com`) are never intercepted or cached. Old caches are deleted on activation.
- **Updates** — the app checks for a service-worker update every 30 minutes; when a new version is installed, a persistent "New version available" toast offers a Refresh button (which sends `SKIP_WAITING` and reloads), and a badge appears on the menu button if the toast is dismissed.
- **Installable PWA** — the install banner appears only after the browser fires `beforeinstallprompt`; accepting it triggers the browser install prompt, and dismissing it records `studylog.installDismissed` so it does not reappear. Settings also shows an "Install StudyLog" row, but only while an install prompt is available.

## Getting started

No build step and no install required.

1. Open `index.html` in a browser (or serve the folder with any static server, e.g. `python3 -m http.server`).
2. Tap **Add** to create your first topic.
3. Move topics through the four stages as you study them.
4. Use the menu (☰) for Search, Calendar, History, Reports, Settings, and Tools.
5. On a phone, accept the **Install** prompt to add StudyLog to your home screen.

## Tech stack

- Plain HTML, CSS, and JavaScript — no framework, no build step.
- `localStorage` for persistence. Keys: `studylog.data.v1` (topics, schema version 1), `studylog.theme` (light/dark), `studylog.installDismissed` (install banner dismissed), `cjay_gdrive_client_id` (Drive OAuth Client ID), `studylog_last_sync` (last Drive sync time). The data layer lives in `storage.js` (`Storage` global); each topic is `{id, subject, topic, steps: {blindRecon, deepRead, blurted, ankiDigitized}, notes, createdAt, updatedAt}`, where each step is `{done, at}` with `at` an ISO timestamp or `null`.
- Google Drive sync uses the Google API client (`gapi`, Drive v3) and Google Identity Services (`google.accounts.oauth2` token client) loaded in the page, with the user's own OAuth Client ID and `drive.file` scope; sync is manual (Connect / Push / Pull), not automatic.
- PWA: `manifest.json` (standalone display, green `#2F6F4E` theme) and `sw.js` service worker (cache `studylog-v1.1.2`).
- Google Fonts (Sora + IBM Plex Sans) and Font Awesome 6.5.1 icons, loaded from CDNs — an internet connection is needed for those assets on first load.
- Google API client (`apis.google.com/js/api.js`) and Google Identity Services (`accounts.google.com/gsi/client`) scripts are loaded in the page; both are only used for Drive sync (see above).

## Project structure

```
StudyLog/
├── index.html    # App shell: header, summary cards, topic list, menus, modals
├── app.js        # App logic (~91 KB, 2,467 lines)
├── storage.js    # Data / persistence layer (~7 KB)
├── styles.css    # All styling (~51 KB)
├── sw.js         # Service worker (offline support)
├── manifest.json # PWA manifest (name, icons, theme, standalone display)
└── icon.svg      # App icon
```

## Status

A working personal tool, actively shaped around one student's real study workflow.
