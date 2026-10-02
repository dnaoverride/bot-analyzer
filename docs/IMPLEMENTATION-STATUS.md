# Implementation status

Last updated: 2026-10-02 (v0.3.0)

## v0.3.0 — completed

| Area | Status |
|---|---|
| Case management (schema v3) | Done |
| Manual submission status per platform | Done |
| Evidence package JSON (report + share) | Done |
| Shareable case import/export | Done |
| Instagram post author + comment ID fields | Done |
| sr/en localization | Done |
| TikTok fixture capture test | Done |
| `npm run package:store` + SHA-256 | Done |
| Store docs + PRIVACY-POLICY.md draft | Done |
| Playwright dashboard test | Done |

## Tests (2026-10-02)

```
npm test          # 23 pass
npm run test:browser   # 1 pass
```

## Still not implemented

| Area | Status |
|---|---|
| Instagram DOM collector | Not implemented |
| IndexedDB storage | Not implemented |
| YouTube / Bluesky / Mastodon adapters | Not implemented |
| Chrome Web Store publication | Not submitted |
| Public privacy/support HTTPS URLs | PLACEHOLDER in docs |

## Store package

- Dev build: `npm run build:extension` (includes TikTok collector, `activeTab` + `scripting`)
- Store build: `npm run package:store` → `release/botanalyzer-0.3.0-chrome.zip` (`storage` only, no collector)
