# Changelog

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
