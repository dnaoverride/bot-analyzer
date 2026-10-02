# Changelog

## 0.3.0 — 2026-10-02

- Case management: multiple local cases, active case selector, per-case evidence and analysis.
- Manual submission status per platform (`not_sent`, `marked_sent`, `outcome_noted`) with optional outcome note.
- Standardized evidence package JSON (`botanalyzer-evidence-package.v1`) for report and share purposes.
- Shareable case export/import: recipients re-review evidence; no copied `include` or submission status.
- Instagram manual fields: post author, comment ID/URL.
- Serbian and English UI (`settings.locale`).
- TikTok HTML fixture test for unreliable author skipping.
- `npm run package:store` → `release/botanalyzer-0.3.0-chrome.zip` (manual Store build, no collector).
- Store docs, privacy policy draft, generated icons, Playwright dashboard test.
- State schema v3 with migration from v2. 23 core tests + 1 browser test.

## 0.2.0 — 2026-10-01

- Extended adapter contract (`supportedHosts`, `canonicalPost`, `detectPage`, `parseProfileIdentity`, `capabilities`, `reporting.checkedAt`).
- Evidence model `schemaVersion` 2 with versioned migration from v1 (`accountKey`, `caseId`, `publishedAt`, normalized `source`).
- Instagram manual adapter: profile, post, and Reel URL validation; reporting instructions.
- Network picker in UI; platform filter in analysis; per-platform report instructions.
- Extension worker dispatches collectors via `supportedHosts` (TikTok only; Instagram collector not shipped).
- `docs/IMPLEMENTATION-STATUS.md` and `docs/PLATFORM-ACCESS.md`.
- 21 core tests (6 new for Instagram and migration).

## 0.1.0 — 2026-09-30

- First modular local dashboard and Chrome/Chromium Manifest V3 extension.
- TikTok URL adapter and experimental user-triggered visible-comment capture.
- Explained text, avatar, and numeric username suffix signals.
- Review-gated evidence reports and CSV/JSON exports.
- Legacy standalone backup import.
- MIT license, contribution guide, documentation and core tests.
