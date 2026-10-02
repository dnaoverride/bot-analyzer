# Chrome Web Store reviewer instructions

1. Install the uploaded ZIP (manual entry build, no DOM collector).
2. Open the options/dashboard page from the extension.
3. **Add / import → Manual entry:** choose TikTok, enter `@demo_user1`, paste a TikTok video URL, add a comment longer than 16 characters, save.
4. Repeat with `@demo_user2` and `@demo_user3` using the **same comment text**.
5. Open **Analysis** — a repeated-message finding should appear (3 profiles).
6. Set review to **Include in report draft**.
7. Open **Report** — draft text and JSON package download should include only included findings.
8. **Evidence → Export shareable case** — import on a second profile/browser; imported records should have pending review (not auto-included).

Synthetic handles only. No live platform login required for core flow.
