# Platform access notes

**This document is an engineering note, not legal advice or a certification of permitted use.**

Last reviewed: 2026-10-01

## TikTok

- BotAnalyzer v0.2.0 includes an **experimental** user-triggered DOM collector for currently visible comments on TikTok desktop/mobile web layouts.
- Collection runs only after the user clicks the extension icon on an open tab (`activeTab` + `scripting`). There is no background crawl, auto-scroll, or profile traversal.
- TikTok frequently changes HTML structure; selectors may fail without notice.
- Automated collection may conflict with TikTok Terms of Service depending on use. Users are responsible for compliance.
- **Store-ready path:** if DOM collection cannot be justified, the published build should rely on manual entry and JSON/TSV import only.

## Instagram

- v0.2.0 ships a **manual adapter only**: profile/post/Reel URL validation, paste import, and reporting instructions.
- The Instagram Graph API / professional APIs are not a general interface for arbitrary third-party comment collection on other users' posts.
- A visible-comment DOM collector is **not implemented** in v0.2.0 and remains unverified. It must not be advertised as a supported feature until access terms and real DOM fixtures are validated.
- **Store-ready path:** manual entry and import only until an approved collection method is documented and tested.

## Chrome Web Store

- The Chrome Web Store Developer Agreement requires compliance with third-party terms of service.
- Permissions should remain minimal: `activeTab`, `scripting`, `storage` only when actually used.
- Listing, privacy policy, and packaged permissions must match shipped behavior. Unverified collectors must be disabled or excluded from the Store build.

## References (verify before publishing)

- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Instagram Platform overview](https://developers.facebook.com/documentation/instagram-platform/overview)
- [TikTok support — report a problem](https://support.tiktok.com/en/safety-hc/report-a-problem/report-a-user)
