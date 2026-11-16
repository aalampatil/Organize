# Contributing to Organize

Bug reports, focused fixes, documentation improvements, and feature proposals are welcome. Read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating. Report vulnerabilities through the [security policy](SECURITY.md), rather than a public issue.

## Start with the problem

Check existing issues before reporting a bug or proposing a feature. Describe the user flow and the behavior you want to change. For a large change, open a feature proposal before implementation so the scope and architecture can be discussed.

## Local development

Use Node.js 24 LTS, npm, and Docker Desktop. Fork the repository if needed, clone your copy, and create a focused branch such as `fix/search-filters` or `feat/folder-navigation`.

```sh
npm ci
npm run setup
npm run db:up
npm run db:migrate
npm run dev:api
```

In a second terminal, run `npm run dev:mobile` for Expo or `npm run dev:web` for the browser. PostgreSQL uses loopback port 15432; the disposable test database uses 15433. The sample workspace on the sign-in screen lets you work on the interface without email or storage credentials.

Keep real credentials in the ignored environment files. See [setup](docs/SETUP.md) for Mailtrap, Resend, Cloudinary, Neon, and physical-device networking.

## Code organization

- Put reusable UI in `apps/mobile/src/components` and design values in `theme`.
- Keep screen behavior and server state in feature hooks; keep transport in `src/lib/api.ts`.
- Put API routes, services, and database access in the appropriate `apps/server/src/modules` feature.
- Put external service adapters behind the interfaces in `src/providers/contracts.ts`.
- Define shared request and response schemas with Zod in `packages/contracts`.
- Use strict TypeScript, descriptive names, and small functions. Avoid unrelated formatting or refactors.

Every private-data query must be scoped to the authenticated owner. Do not accept ownership or storage identifiers from the client. Preserve OTP limits, session revocation, folder cycle checks, and private file access when changing those flows.

## Database and configuration changes

Keep `apps/server/src/db/schema.ts` and the reviewed SQL migrations in sync. Add a new numbered SQL migration for a schema change; do not edit a migration that has already been applied. The migration runner checks stored checksums.

Document new environment values in the relevant `.env.example` and setup guide. Only the API base URL belongs in the client's `EXPO_PUBLIC_*` configuration. Include migration, compatibility, and operational notes in the pull request when relevant.

## Verify your change

```sh
npm run check
npm run test:db:up
npm run test:integration
```

For interface changes, install the browser once and run the browser flows:

```sh
npx --no-install playwright install chromium --only-shell
npm run test:browser
```

The browser command builds the Expo web app, starts an isolated API using test email/storage providers, and checks desktop and mobile-sized flows against the disposable database. It uses ports 4000 and 8087 and writes screenshots to ignored `.tmp/screenshots`. Close other processes using those ports first. It does not send real email or upload to Cloudinary.

Add tests for meaningful behavior changes, especially authentication, ownership, search, migrations, and file lifecycle. Pure documentation or visual-only edits normally need formatting and an appropriate manual review. State which checks you ran and which you could not run. Native interaction changes should also be checked on an emulator or device when available.

Dependency changes must include the root lockfile. Check `npm audit` and explain any remaining advisories; do not force a downgrade of the requested Expo SDK to silence a toolchain warning.

## Commits and pull requests

Create a small conventional commit for each coherent completed change: `feat:`, `fix:`, `docs:`, `test:`, `perf:`, or `chore:`. Include relevant tests and documentation. Keep unrelated changes in separate commits.

Open a pull request against `main` using the provided template. Lead with the problem and the resulting behavior, include validation evidence, and add screenshots for interface changes. Ensure the working tree contains no credentials, private files, OTPs, or session tokens. Respond to review feedback with focused follow-up commits.

Contributions are provided under the repository's [MIT license](LICENSE). Only submit work you have the right to contribute.
