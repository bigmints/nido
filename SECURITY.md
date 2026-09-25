# Security Policy

## Threat model in short

Nido is a static web app. There is no server, no account system and no database operated by the project.
User data (including photos) stays in the browser's IndexedDB. The optional AI API key is stored in the
browser's `localStorage` and is only ever sent to the endpoint the user configures.

Areas we care most about:

- Accidental exfiltration of user data or photos to any third party.
- Unsafe handling of imported backup files (backups are validated and unknown keys are dropped).
- Leaking the AI API key (it is excluded from exports and never logged).
- Cross-site scripting (user-provided text is rendered through React, never as raw HTML).

Note that anyone with access to the browser profile can read `localStorage`. Use a key with a low spending
limit, or a local model such as Ollama, if that matters to you.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private vulnerability reporting
("Security" tab, "Report a vulnerability") on this repository, and include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- the affected version or commit.

You can expect an acknowledgement within a few days. Fixes are released as soon as reasonably possible
and credited to the reporter unless you prefer otherwise.

## Supported versions

Only the latest release on the `main` branch receives fixes.
