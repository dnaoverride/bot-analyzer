# Verification for v0.1.0

## Automated core checks

`npm test` covers URL host spoofing, repeated-message deduplication, review gating of reports, false-positive cases (short comments and blank images), text normalization, numeric username suffix matching, cross-platform separation, legacy JSON migration, and spreadsheet formula escaping.

## Browser verification

JavaScript syntax, the local server responses and Manifest V3 packaging were checked. A headless Chromium run could not be completed because no browser binary was installed and the download failed. The dashboard and extension have not been visually or interactively verified in a browser in this environment. Browser/manual image upload and live capture need PC acceptance testing.

## Limits of verification

The collector has not been validated against a live signed-in TikTok session. DOM fixture success is not proof that every current TikTok layout works. The extension's visible-comment extraction is experimental. Always review imported author/text associations and compare against the original page.

Image heuristics are tested with synthetic image pairs. They are not benchmarked against labeled TikTok bot data. No precision, recall, or bot-detection accuracy is claimed. High volume limits have not been performance benchmarked.
