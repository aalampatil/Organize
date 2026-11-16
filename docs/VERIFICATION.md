# Verification evidence

Verified locally on Windows with Node.js 24.22.3, TypeScript 6.0.3, Expo SDK 57.0.33, React Native 0.86.3, Drizzle 0.45.2, and Docker PostgreSQL 17.

## Completed checks

| Check                               | Result                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Workspace dependency installation   | Completed; root lockfile retains registry integrity metadata                                                                     |
| `npm ci --dry-run --ignore-scripts` | Passed                                                                                                                           |
| Full strict TypeScript checks       | Passed for mobile, server, and shared contracts                                                                                  |
| `npm test`                          | 23 passed: validation/security, PostgreSQL service behavior, and real PDF extraction                                             |
| `npm run test:integration`          | 6 passed against Docker PostgreSQL through Fastify and node-postgres                                                             |
| Browser flows                       | 2 passed: desktop with the real API/database, and a mobile-sized preview                                                         |
| Expo SDK compatibility              | `expo install --check` reports dependencies up to date                                                                           |
| Expo web export                     | Passed; approximately 1.1 MB JS and one 56 KB Feather font asset                                                                 |
| Development database migration      | Applied successfully                                                                                                             |
| Running local preview               | Expo at localhost:8081 opens the sample library without page errors; API health at localhost:4000 reports the database connected |
| Repository community files          | Issue forms parsed successfully and 29 local community-document links were checked                                               |
| Docker services                     | Healthy on loopback ports 15432 and 15433                                                                                        |
| Environment setup                   | Ignored env files created with a random secret; credentials were not printed                                                     |
| Local commits                       | Initial implementation and subsequent fixes saved in separate commits; nothing pushed                                            |

## What the tests exercise

The service and HTTP suites cover OTP expiry, cooldowns, failed-attempt persistence, concurrent single-use verification, token hashing, session revocation, owner isolation, folder cycles and depth limits, database ownership constraints, full-text/partial/tag search, transactional index updates, favorites, trash/restore, authorized downloads, permanent deletion, and upload compensation after metadata failure.

The PDF tests create a valid PDF, extract its text through the real parser, and verify that malformed input fails without crashing the API. Extraction runs in a child process with a V8 heap budget and a timeout to contain native parser failures.

The desktop browser flow signs in by email code, creates a folder and nested subfolder, saves a tagged note, verifies global content search reaches the API without a folder restriction, favorites the note, uploads and searches a text file, and trashes/restores the note. The mobile-sized flow checks sample-note creation, search, account navigation, and horizontal overflow. Both flows finish without page errors. Screenshots are in `docs/images`.

Browser and HTTP tests inject email/storage providers and use a disposable PostgreSQL database. They do not send real email or transfer files to Cloudinary. The standard unit/service suite also runs PostgreSQL semantics through PGlite.

## Remaining verification

- Real Mailtrap/Resend delivery, Cloudinary upload/download/delete, and Neon TLS connections require account credentials.
- Android/iOS emulator and physical-device testing has not been executed. A mobile-sized browser check is not a native-device test.
- GitHub Actions will run after the user pushes the committed changes; local execution does not claim a CI result.
- The dependency audit has no high or critical findings after updating Nodemailer. Seven moderate findings remain in the Expo fingerprint/Drizzle Kit toolchain; the audit's forced fixes suggest incompatible downgrades. The requested Expo 57 stack is retained.

See [setup](SETUP.md) for commands to reproduce the checks and [SECURITY.md](../SECURITY.md) for private vulnerability reporting.
