# BotAnalyzer

Local, open source review of possible coordinated social media activity. **Find patterns, inspect evidence, and prepare a report.** Version 0.2.0-beta, MIT licensed.

Currently includes **TikTok** (with experimental visible-comment capture) and **Instagram** (manual entry and import only). Additional platforms plug into an adapter interface. No API keys, telemetry, backend database, npm dependencies, or cloud processing.

**This is a review assistant, not a bot classifier.** Similar comments, names, and avatars do not establish automation, account ownership, or account purchases. Political views, private profiles, and follower counts are not used as suspicion signals.

## Quick start

Requires Node.js 20+ only. No `npm install` is necessary.

```sh
npm start
```

Open http://127.0.0.1:4173. The server listens only on localhost and serves static files. Analysis and storage run in the browser.

For Serbian setup instructions see [POCETAK.md](docs/POCETAK.md).

## Chrome / Chromium extension

```sh
npm run build:extension
```

1. Open `chrome://extensions` (or the corresponding Chromium extensions page).
2. Enable **Developer mode** and click **Load unpacked**.
3. Select `dist/extension` (not the project root).
4. Open TikTok, display comments, and click the extension icon (Instagram: use manual entry or JSON import in the dashboard).
5. Open **Dodaj / uvezi → Uvezi poslednju kolekciju iz dodatka**, inspect the preview, and save.

The extension uses only `activeTab`, `scripting`, and `storage`; no permanent host permissions or background crawl. TikTok comment collection is **experimental**, based on a few DOM selectors. Instagram has **no automatic collector** in this version. Always verify author/text association in the preview. Avatar comparison uses manually supplied cropped images.

## Features

- Network picker (TikTok, Instagram) for manual entry and paste import.
- Manual evidence entry, TSV paste, JSON import/export, spreadsheet-safe CSV, and old standalone `tiktok-dokazi.html` backup migration.
- Schema v2 evidence model with migration from v1 backups.
- Identical normalized comment groups (at least 3 different profiles, 16 characters and 4 distinct words).
- Pair review: exact/near text, common username with numeric suffix differences, and similar avatar fingerprints.
- Independent clues shown separately; pair review priority is not a probability.
- Human review states: pending, include in report, dismiss.
- Only included findings enter a report. Adding/deleting evidence or changing matching settings resets reviews to avoid silently altering approved evidence.
- Local browser storage, small avatar previews, and plaintext evidence reports.
- Platform adapter registry and clear contribution guide.

## Limits

Up to 2,000 stored evidence records; pair comparison up to 500 distinct profiles and 250 displayed pairs. Larger collections should be divided into cases. These limits keep browser analysis manageable; this prototype has not been benchmarked at its limits.

Collection time is **not posting time**. The app does not infer synchronized posting, private profile data, IP addresses, payment history, face identity, or hidden coordination. It cannot determine whether an account is purchased. Generic slogans and popular avatars can produce matches. More independent evidence may justify review, but never certainty.

JSON backups contain public profile links, comments, notes, and small avatars. Keep original screenshots separately. Browser and extension storage are separate; transfer between them using JSON. Clear browsing data or uninstalling the extension can erase local evidence.

## Tests

```sh
npm test
```

Uses Node's built-in test runner with no dependencies. See [VALIDATION.md](docs/VALIDATION.md) for the browser checks and limits of verification.

## Project layout

```text
src/core/       validation, normalization, image hashing, matching, storage, reports
src/adapters/   platform URL/reporting contracts and TikTok DOM capture
src/ui/         local dashboard
extension/      Manifest V3 and user-triggered collector
scripts/        localhost server and extension packaging
tests/         core regression tests
docs/          setup, architecture, privacy, validation
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [PRIVACY.md](docs/PRIVACY.md).

This project has not been published to the Chrome Web Store. See [PLATFORM-ACCESS.md](docs/PLATFORM-ACCESS.md) and [IMPLEMENTATION-STATUS.md](docs/IMPLEMENTATION-STATUS.md) for current scope and verification notes.
