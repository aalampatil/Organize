# Security and operational notes

- Every folder and item query includes the authenticated user. Composite foreign keys independently prevent cross-owner folder relationships.
- OTP hashes use HMAC-SHA256 with a server-only secret. Session tokens contain 256 random bits, with SHA256-only database storage. Verification, attempt updates, and code consumption run under a per-email transaction lock.
- Folder tree mutations serialize per user, reject cycles, and prevent deletion of nonempty folders. A session cannot choose its owner through request data.
- Search parameters are bound values. Literal `%`, `_`, and backslashes are escaped for substring matching. Search documents update through a database trigger in the same transaction as the item.
- Native sessions use Expo SecureStore. Web uses tab-scoped `sessionStorage`; JavaScript can access this token. Host the web app with a restrictive content security policy, avoid third-party scripts, and use HTTPS. An HttpOnly cookie/BFF is a future web-specific hardening option.
- Cloudinary assets use `raw` with `authenticated` delivery and randomized IDs. Downloads require ownership and return a signed download API URL with a five-minute expiry. Signed URLs remain bearer links until expiry. Original files are delivered as attachments.
- Uploads are bounded before storage. PDF extraction runs in an isolated child process with a time limit, V8 heap budget, fifty-page limit, and disabled PDF evaluation. Native parser crashes remain outside the API process. This is a personal file library; a production public upload service would need malware scanning and per-user storage quotas.
- Metadata failure attempts remote asset cleanup. A cleanup failure returns a specific error; operators must reconcile orphaned assets under the account's Cloudinary prefix. Provider calls are not a distributed transaction.
- Private request bodies, search URLs, SQL values, OTPs, sessions, and provider credentials are excluded from routine request logging.
- Linked-file endpoints accept metadata only and reject local paths, URIs, bookmarks, handles, contents, and owner/storage IDs. File handles stay in account-scoped IndexedDB records; native bookmarks/URI descriptors stay in the app's private documents directory. References never call upload/download/storage-deletion providers. Local browser previews sandbox file contents so HTML/SVG cannot execute with the application's origin or access its session. OS read permission remains required; see [platform limits](FILE_REFERENCES.md).
- Production configuration requires Resend, Cloudinary, HTTPS web origins, and PostgreSQL TLS. `AUTH_SECRET` must be random and persistent across API instances. Changing it invalidates outstanding codes.
- IP rate limits are process-local; email cooldown and attempt limits live in PostgreSQL. Configure an edge rate limiter and a deliberately scoped trusted-proxy policy before scaling behind a proxy. The default refuses forwarded IP headers.
- Expired sessions/challenges are harmless but retained until replaced/deleted. Production operations should periodically delete expired records and maintain backups. No background scheduler or live deployment is provisioned by this repository.

## Scope of verification

Service tests use real PostgreSQL semantics through PGlite. HTTP integration tests target a separate Docker/PostgreSQL database. Neither replaces live Cloudinary, Mailtrap, Resend, Neon TLS, or native-device checks; see [verification](VERIFICATION.md).
