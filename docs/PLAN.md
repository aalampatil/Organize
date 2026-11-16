# Implementation plan

The fifteen initial implementation groups have been committed locally after full access was restored. Follow-up fixes receive their own commits. The user handles pushing. See [commit status](COMMITS.md).

| Phase                                             | Implementation      | Verification                                                                                                     |
| ------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Product docs, architecture, plan                  | Written before code | Baseline committed by user                                                                                       |
| Workspaces, TypeScript, Docker, environment setup | Implemented         | Dependencies installed, lockfile committed, Docker services healthy                                              |
| Shared Zod contracts                              | Implemented         | Validation tests and strict core typecheck pass                                                                  |
| Drizzle schema, search indexes, migration         | Implemented         | Migrations and search pass against PGlite and Docker PostgreSQL                                                  |
| Email OTP and sessions                            | Implemented         | Expiry, attempts, concurrency, replay, revocation tests pass; live email pending                                 |
| Folders, notes, tags, favorites, trash            | Implemented         | Ownership, cycles, nesting depth, index updates, restore tests pass                                              |
| Cloudinary files and extraction                   | Implemented         | File lifecycle and real PDF parsing pass; live Cloudinary transfer pending                                       |
| Expo interface and sample workspace               | Implemented         | Full types, Expo compatibility, web export, and desktop/mobile-sized browser checks pass                         |
| HTTP integration and CI                           | Implemented         | 6 Docker API tests pass locally; CI workflow ready for the user's push                                           |
| Setup, API, security, credential handoff          | Documented          | See verification evidence                                                                                        |
| Community and contribution files                  | Implemented         | README, description, MIT license, conduct/contributing/security policies, issue forms, and PR template committed |

## Remaining checks

- Exercise live Mailtrap/Resend delivery, Cloudinary upload/download/delete, and Neon connections after credentials are supplied.
- Verify Android/iOS behavior and then production Neon/Resend settings when credentials are provided.
- Keep subsequent fixes and verification updates in separate local commits; no push by the agent.

## Verification approach

Test OTP expiry, attempt exhaustion, replay protection, session revocation, owner isolation, folder cycle prevention, item/tag search, trash behavior, and upload validation. Use a real disposable PostgreSQL database for integration tests where Docker is available. Run strict checks for every workspace and compile a web bundle as a cross-platform smoke check. Record unavailable services explicitly; never report provider delivery or native-device testing as complete without executing it.
