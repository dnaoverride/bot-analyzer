# Security

Do not publish credentials or real personal data in issue reports. If this project is published, report security problems privately to the repository maintainer through the hosting service's private security advisory feature when available.

Input links use HTTPS host allowlists. User text is rendered with textContent. JSON input is bounded and validated; avatar previews accept PNG data URLs only. CSV exports escape cells and neutralize leading spreadsheet formula characters. Extension code uses Manifest V3 and a local-only content security policy. The local server listens on 127.0.0.1 only and allows static HTML/JS/CSS files beneath the project root.

No security audit is claimed. Browser storage and exported backups are not encrypted by this application. Do not put secrets in notes. Dependency-free runtime reduces supply chain surface but does not establish security on its own.
