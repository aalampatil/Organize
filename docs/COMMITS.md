# Change log and commit boundaries

The user committed the documentation baseline as `cc82c99`. Full local access was restored on November 16, 2026, and the fifteen implementation groups below have now been committed successfully. Follow-up validation fixes receive new commits. Nothing is pushed by the agent.

The latest user instruction is to create local commits only; the user will push. The implementation was saved with this script, which stages explicit paths, skips unchanged groups, stops on Git errors, and never pushes:

```powershell
pwsh -File scripts/commit-work.ps1
```

Completed initial implementation commits, in creation order:

1. `94337f6` — scaffold Expo and Node TypeScript workspaces
2. `f27c15e` — shared Zod request and response contracts
3. `651e37c` — Drizzle schema and PostgreSQL search migration
4. `fd21410` — email OTP and revocable sessions
5. `c255ac9` — owner-scoped nested folders
6. `78601f6` — notes, tags, favorites, trash, and indexed retrieval
7. `ec5628f` — private Cloudinary files and bounded text extraction
8. `c37eff6` — authenticated API and graceful server lifecycle
9. `efe3404` — Expo design tokens and reusable UI components
10. `5ca50f7` — typed API transport and secure session storage
11. `6097b4a` — email sign-in and isolated sample workspace
12. `1e09458` — folder management and note editor
13. `5083ff3` — responsive library search and file management
14. `7c50315` — authentication, ownership, search, and file lifecycle tests
15. `3ea1737` — setup, API, verification, and local commit documentation

The earlier `.git` sandbox failure is resolved. Dependencies, Docker PostgreSQL, the API, PDF extraction, and browser flows are verified. Follow-up commits cover database port isolation, the lockfile, safe error handling, parser process isolation, Metro resolution, bundle size, accessibility, browser testing, and community documentation. See [verification](VERIFICATION.md) for evidence and `git log --oneline` for the complete history.

The repository's GitHub About description was updated successfully through authenticated repository metadata access. Code and community files remain in local commits for the user to push.

## File references — November 18, 2026

The existing-file enhancement is saved in focused local commits:

1. `8fb38cc` — metadata-only contracts, database migration, owner-scoped create/reconnect endpoints, storage totals, and service/validation checks.
2. `c4c4dbd` — persistent browser handles, native document permissions/bookmarks, platform adapters, dependencies, and typed API transport.
3. `6de9533` — upload/link choices, linked labels, context organization, quick access, reconnect/recovery, and original-preserving deletion.
4. `bc25348` — reference API integration and browser lifecycle, permission denial, reconnect recovery, original preservation, and browser-flow isolation.
5. Documentation and verification follow in a separate commit; use `git log --oneline` for its hash.

All changes remain local for the user to push. See [file-reference behavior and platform limits](FILE_REFERENCES.md) and [verification evidence](VERIFICATION.md).
