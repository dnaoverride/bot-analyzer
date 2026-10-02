# Architecture

## Data flow

User-triggered visible TikTok DOM capture → temporary extension collection → editable selection preview → validated evidence records → matching → human review → report export → manual platform submission.

The standalone browser dashboard supports manual entry and import. Both dashboards share the same ES modules. The extension build copies the same files, with no separate matching implementation.

## Evidence model

`{ id, schemaVersion, platform, accountKey, handle, displayName, profile, profileUrl, postUrl, commentUrl, commentId, text, note, avatar, observedAt, publishedAt, source, collectorVersion, caseId }`

`profile` is kept as an alias of `profileUrl` for compatibility. `schemaVersion` is 2 in current releases; v1 state migrates on load.

- Profile and post URLs are validated by the platform adapter. Only supported HTTPS hosts are accepted.
- `observedAt` is capture time, never inferred posting time.
- `avatar` contains 64-bit dHash, 64-bit aHash, grayscale contrast and a 64×64 preview. It has no face embedding or biometric identity model.
- Original screenshots and full avatars are not stored. Keep them separately for a report.
- Normalization preserves original text; a separate form lowercases, transliterates Serbian Cyrillic, folds diacritics, removes punctuation and consolidates spaces for matching.

## Signals

Text groups require 3 distinct profiles and a nontrivial message. Pair text matching requires 16 normalized characters and 4 distinct words. Near matches require at least 6 distinct words on both sides and Jaccard ≥ 0.90. Token-set similarity ignores word order; this can produce false positives and is explicitly labeled.

Username matching removes trailing numeric suffixes and requires a stem with at least 5 non-punctuation characters. It cannot identify name changes over time.

Image matching compares dHash (≤5 differing bits) and aHash (≤10 bits) and excludes images with grayscale contrast below 8. These are heuristic thresholds, not calibrated confidence values. Cropping, circular frames and palette changes can cause false negatives or false positives.

Pairs with at least two independent signal types are prioritized, not declared bots. Shared text and shared image remain separate clues; no percentage is computed. All decisions are pending initially. Only user-included findings enter reports. Dataset changes reset review decisions.

## Platform adapters

Each adapter exports `{ id, name, supportedHosts, capabilities, canonicalProfile, parseProfileIdentity, handle, validPost, canonicalPost, detectPage, reporting }`. See CONTRIBUTING.md.

Registered platforms: **TikTok** (experimental visible-comment capture in dev build), **Instagram** (manual import only; no DOM collector).

State `schemaVersion` 3 adds `cases`, `activeCaseId`, and `submissions` (manual per-platform status). Evidence packages (`botanalyzer-evidence-package.v1`) support `purpose: report` (included findings only) and `purpose: share` (records only; recipient re-reviews).

Matching code uses the platform ID and never compares profiles across platform boundaries. TikTok and Instagram accounts with the same handle are separate evidence.

## Resource boundaries

The analysis runs on the UI thread. Up to 2,000 evidence records, 500 profiles for pair comparison, and 250 displayed pairs. No remote API or embedded model. Larger future versions should index text/avatars and move matching to a Web Worker.

## Storage and extension permissions

Dashboard: browser localStorage. Extension: chrome.storage.local. Temporary capture batches are separate from reviewed records. Collection does not imply that records are suspicious.

`activeTab` + `scripting` permit injection only after the user clicks. No host_permissions, persistent content scripts, timer or scroll automation. The content collector reads a small set of rendered comment selectors; verify captured author association. No hidden API endpoint is called.

## Roadmap

1. Validate and maintain TikTok selectors against anonymized fixtures from multiple layouts.
2. Instagram visible-comment collector after access review and real DOM fixtures.
3. Case management UI and IndexedDB for larger evidence sets.
4. Chrome Web Store packaging (`package:store`, icons, store docs).
5. Adapters for YouTube, Bluesky, Mastodon (see plan doc).
6. Accessible localization (en), Firefox packaging, and release signatures.

No roadmap feature is part of the current release unless present in the code.
