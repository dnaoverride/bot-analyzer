# Implementation status

Last updated: 2026-10-01 (v0.2.0)

## v0.2.0 — completed in this cycle

| Area | Status |
|---|---|
| Extended adapter contract | Done |
| Evidence model schema v2 + v1 migration | Done |
| Instagram manual adapter | Done |
| Network picker and platform filter in UI | Done |
| Per-platform report instructions | Done |
| Extension worker `supportedHosts` dispatch | Done (TikTok collector only) |
| `docs/PLATFORM-ACCESS.md` | Done |
| Core tests | **21 pass** (`npm test`, 2026-10-01) |

## Still not implemented

| Area | Status |
|---|---|
| Instagram DOM collector | Not implemented; marked unverified |
| TikTok collector live-session verification | Not verified in CI |
| Browser / Playwright tests | Not implemented |
| Chrome Web Store package (`package:store`) | Not implemented |
| Store icons, `docs/store/*`, public privacy URL | Not implemented |
| Case management UI | Not implemented (only `caseId: 'default'`) |
| IndexedDB storage | Not implemented |
| English localization | Not implemented |

## Test results (2026-10-01)

```
npm test
# 21 tests, 21 pass, 0 fail
```

## Verification notes

- TikTok collector: selectors not validated against a live signed-in session in CI.
- Instagram: manual entry/import only; no automatic collection.
- No claim of Chrome Web Store publication or approval.
