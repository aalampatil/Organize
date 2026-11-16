# Verification evidence

## Executed in the restricted Windows session

| Check                                               | Result                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Shared Zod, hashing, filename, MIME, wildcard tests | 13 passed                                                                                                      |
| PostgreSQL service tests using PGlite               | 8 passed                                                                                                       |
| Combined test result                                | **21 passed, 0 failed, 0 skipped**                                                                             |
| Core dependency-aware strict TypeScript check       | Passed for contracts, environment, schema/connection/migrations, auth, folders, library, and upload validation |
| Source syntax and local import scan                 | 70 TypeScript files passed; no syntax or missing local import errors                                           |
| PowerShell commit script parsing                    | Passed                                                                                                         |
| Environment setup script                            | Executed; ignored env files created and random secret generated without printing it                            |

The PostgreSQL tests execute the actual SQL migration with `pg_trgm`, Drizzle queries, OTP locking and attempt persistence, concurrent code consumption, session revocation, owner isolation, folder cycles/depth, partial/full-text/tag search, index updates, trash/restore, private file lifecycle, and cleanup after metadata failure. Cloudinary and email are injected test doubles; these tests do not call provider services.

Because network access prevented standard installation, temporary tooling under ignored `.tmp/` read public packages from the existing local npm cache. Cached archive integrity was checked before extraction. The service tests used Drizzle 0.45.2, PGlite 0.4.3, and Zod 4.6.7. The focused compiler check used cached TypeScript 5.9.3; the project targets TypeScript 6.0.3. A partial client check against available React Native 0.86.3 and SDK 57 declarations reported four unresolved imports, all for unavailable DocumentPicker/SecureStore packages. This isolated verification does not substitute for installing the declared workspace dependencies and running the full checks.

## Pending or blocked

- Standard `npm install`: registry access denied; several required packages are unavailable offline. No root lockfile was fabricated.
- Full workspace TypeScript check and Expo web bundle: blocked by missing packages, including SDK 57 DocumentPicker/SecureStore and the required Metro runtime patch.
- Docker: access to the Docker engine pipe is denied. Full Fastify/HTTP/node-postgres integration tests are written but were not executed here.
- Live Mailtrap/Resend, Cloudinary, Neon TLS, and PDF parser smoke checks: credentials/dependency access pending.
- Native Android/iOS and browser interaction testing: not executed; no visual or native-device pass is claimed.
- Local Git commit: `git add -- packages/contracts` fails with `Unable to create .../.git/index.lock: Permission denied` because this session mounts `.git` read-only.
- GitHub API write attempts: returned 403; no remote tree/commit/ref change was made. The latest instruction leaves all pushing to the user.

Run the documented [setup and checks](SETUP.md) after restoring package/Docker access. The CI workflow runs type checks, tests, HTTP integration, formatting, and a web export in an environment with dependency access; CI has not yet run for these uncommitted changes.
