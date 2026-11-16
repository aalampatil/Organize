# Implementation plan

The fifteen initial implementation groups have been committed locally after full access was restored. Follow-up fixes receive their own commits. The user handles pushing. See [commit status](COMMITS.md).

| Phase                                             | Implementation      | Verification                                                                               |
| ------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| Product docs, architecture, plan                  | Written before code | Baseline committed by user                                                                 |
| Workspaces, TypeScript, Docker, environment setup | Implemented         | Setup script executed; full dependency install/Docker blocked                              |
| Shared Zod contracts                              | Implemented         | Validation tests and strict core typecheck pass                                            |
| Drizzle schema, search indexes, migration         | Implemented         | PostgreSQL migration/search executed through PGlite                                        |
| Email OTP and sessions                            | Implemented         | Expiry, attempts, concurrency, replay, revocation tests pass; live email pending           |
| Folders, notes, tags, favorites, trash            | Implemented         | Ownership, cycles, nesting depth, index updates, restore tests pass                        |
| Cloudinary files and extraction                   | Implemented         | Text/lifecycle/compensation tests pass with fake storage; real transfer/PDF worker pending |
| Expo interface and sample workspace               | Implemented         | Syntax/local imports checked; full bundle/native-device checks pending                     |
| HTTP integration and CI                           | Added               | Docker/API suite not executed in this session                                              |
| Setup, API, security, credential handoff          | Documented          | See verification evidence                                                                  |

## Remaining checks

- Install the full dependency graph, generate and commit the root npm lockfile.
- Run the complete TypeScript checks and Expo compatibility/bundle checks.
- Run Fastify HTTP integration against Docker PostgreSQL.
- Exercise Mailtrap OTP delivery, Cloudinary upload/download/delete, and PDF extraction with real files.
- Verify Android/iOS behavior and then production Neon/Resend settings when credentials are provided.
- Keep subsequent fixes and verification updates in separate local commits; no push by the agent.

## Verification approach

Test OTP expiry, attempt exhaustion, replay protection, session revocation, owner isolation, folder cycle prevention, item/tag search, trash behavior, and upload validation. Use a real disposable PostgreSQL database for integration tests where Docker is available. Run strict checks for every workspace and compile a web bundle as a cross-platform smoke check. Record unavailable services explicitly; never report provider delivery or native-device testing as complete without executing it.
