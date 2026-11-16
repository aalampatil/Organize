# Security policy

Organize stores private notes and files. Report vulnerabilities through a private channel so a fix can be coordinated before sensitive details become public.

## Supported versions

Security fixes target the current `main` branch. The project is in development; no older release branches currently receive security fixes. Use the latest code and dependency lockfile when investigating an issue.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/aalampatil/Organize/security/advisories/new) when available. Otherwise, email the maintainer at [aalam.workacc@gmail.com](mailto:aalam.workacc@gmail.com) with the subject `Organize security report`.

Please include:

- The affected component and commit or version.
- Steps to reproduce using test accounts and synthetic files.
- The likely impact and any suggested mitigation.
- Relevant logs or screenshots with secrets and personal data removed.

Do not open a public issue containing exploit instructions, active credentials, OTPs, session tokens, private download URLs, or other people's files. Never test against accounts or infrastructure you do not control.

Maintainers will review the report, confirm the scope, coordinate a fix or mitigation, and agree on disclosure details where possible. Response and fix timing depend on the severity and available reproduction information.

## Relevant areas

Authentication and OTP replay, session theft or revocation, cross-account access, folder ownership, search isolation, private Cloudinary delivery, upload handling, text extraction, and exposed environment values are within scope.

For implemented controls, operating assumptions, and verification limits, see [technical security notes](docs/SECURITY.md) and [verification evidence](docs/VERIFICATION.md). External email, storage, and database providers also maintain their own security policies.
