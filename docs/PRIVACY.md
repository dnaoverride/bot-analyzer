# Privacy

BotAnalyzer v0.1.0 stores records only in the browser or extension storage on the current device. It has no analytics, ads, external API calls, cloud uploads, or remote avatar loading. The localhost Node server serves files and does not receive the evidence records.

The extension reads the rendered page only after clicking its icon and does not request persistent access to websites. It reads currently visible TikTok comments and the associated public profile links. No passwords, cookies, inbox, private profile data or hidden account information are read.

Avatar files are processed locally into hashes and 64×64 previews. They are compared as images; there is no facial recognition or biometric identification. Original image files are not uploaded or retained by the app.

Exports contain public profile links, comments, notes, capture timestamps and (for JSON) small avatar previews. Treat these files as potentially sensitive collections. Redact personal information before sharing a bug report. Preserve original screenshots separately if needed as evidence.

Use Evidencija → Obriši lokalnu evidenciju to remove saved records/review states; it does not remove previously downloaded backups. Temporary extension capture data can also be cleared by removing extension storage or uninstalling the extension.

Browser and extension storage are separate. Users are responsible for backup and sharing decisions. The project does not make legal claims about how data may be collected or published in each jurisdiction; check relevant platform terms and applicable requirements for your own use.
