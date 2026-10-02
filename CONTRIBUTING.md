# Contributing

Use Node.js 20+. There are no runtime dependencies. Run `npm test` and `npm run build:extension` before submitting changes.

## Add a network

1. Create `src/adapters/<platform>.js` exporting the adapter contract: `{id,name,supportedHosts,capabilities,canonicalProfile,parseProfileIdentity,handle,validPost,canonicalPost,detectPage,reporting}`. Return `null` for invalid URLs. Allowlist actual HTTPS platform hosts in `supportedHosts`.
2. Register it in `src/adapters/index.js`. The matching engine already partitions evidence by platform.
3. Add the platform to the UI network picker in `src/ui/app.js` (via `listAdapters()`).
4. Add user-triggered capture separately only after access review; register in `extension/worker.js` via `collectors` map and `supportedHosts`. Never insert DOM selectors into the matching engine.
5. Add URL spoofing tests, fixtures for comment-author association and documentation of permission requirements.
6. Verify reporting instructions using the network's primary documentation. Automated mass reporting is outside this project scope.

## Match changes

Document thresholds, expected false positives, and counterexamples. Use synthetic examples and avoid adding real personal data to fixtures. A finding should show its evidence; never replace explanation with an opaque bot score. Avoid political, ideological, language-group, or private-profile suspicion classifiers.

## TikTok collector fixes

Use minimized anonymized HTML fixtures. Text and username association matter more than capturing every comment. It is better to return no records and explain missing selectors than to assign a comment to the wrong author. Do not infer posting time from time of collection.

## Licensing

By contributing you agree to release your contribution under this repository's MIT license. Add third-party licenses when including third-party code. Do not publish exported real account collections without an appropriate basis.
