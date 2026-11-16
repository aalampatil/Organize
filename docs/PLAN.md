# Implementation plan

Each phase is committed independently. Smaller fixes and follow-up verification receive their own commits. Status reflects verified work rather than intended work.

- [x] Document requirements, architecture, repository boundaries, and commit policy.
- [ ] Establish workspace tooling, strict TypeScript, formatting, environment templates, and Docker PostgreSQL.
- [ ] Add shared contracts and versioned Drizzle data model/search migrations.
- [ ] Implement email providers, OTP authentication, and revocable sessions.
- [ ] Implement owner-scoped folders, notes, tags, search, favorites, and trash.
- [ ] Implement private Cloudinary uploads, bounded extraction, and authorized downloads.
- [ ] Build Expo design system, session flow, and responsive library.
- [ ] Connect notes, files, folders, filters, and retrieval flows.
- [ ] Run type checks, meaningful security/API/database tests, and an Expo bundle check.
- [ ] Finalize setup instructions, test evidence, limitations, and credential handoff.

## Verification approach

Test OTP expiry, attempt exhaustion, replay protection, session revocation, owner isolation, folder cycle prevention, item/tag search, trash behavior, and upload validation. Use a real disposable PostgreSQL database for integration tests where Docker is available. Run strict checks for every workspace and compile a web bundle as a cross-platform smoke check. Record unavailable services explicitly; never report provider delivery or native-device testing as complete without executing it.
