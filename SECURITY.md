# Security Policy

EnvSync handles secrets (API keys, database credentials, tokens). If you find a vulnerability, please don't open a public GitHub issue.

## Reporting

Email the maintainer directly with:
- A description of the issue and its impact
- Steps to reproduce
- Any relevant logs or screenshots (redact real secret values)

Please allow a reasonable amount of time to investigate and fix before any public disclosure.

## Scope

In scope: authentication, session handling, RBAC/access control, encryption (envelope encryption of secret values), API token scoping, audit logging, rate limiting.

Out of scope: issues requiring physical access to a deployed server, social engineering, or vulnerabilities in third-party dependencies without a demonstrated EnvSync-specific exploit path (report those upstream instead).

See [`Frontend/src/app/docs/security/page.tsx`](Frontend/src/app/docs/security/page.tsx) for the real, current description of this project's security architecture.
