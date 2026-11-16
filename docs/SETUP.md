# Setup and credentials

Use Node.js 24 LTS (24.3 or newer), npm workspaces, Docker Desktop, and Expo SDK 57. PostgreSQL runs in Docker locally and Neon in production. Windows can develop Android and web; building iOS locally requires macOS or an Expo build service.

## First run

From the repository root:

```sh
npm install
npm run setup
npm run db:up
npm run db:migrate
npm run dev:api
```

`setup` creates ignored `apps/server/.env` and `apps/mobile/.env` files, generates a random authentication secret, and preserves existing values. It never prints credentials. Replace the empty Mailtrap and Cloudinary settings before using real sign-in and uploads. PostgreSQL's local-only credentials are already in the server example.

In a second terminal:

```sh
npm run dev:mobile
```

Use the Expo development client for SDK 57 on a phone/emulator, or `npm run dev:web` for the browser. The sign-in screen's **Explore a sample library** action runs an isolated in-memory preview without an API, database, email, or Cloudinary account. Preview data is discarded when you leave it; uploads and downloads require a real account.

The API binds to port 4000 and Expo web normally uses port 8081. Check `http://localhost:4000/health` after starting the API. A database error returns 503; a successful connection returns `status: ok`. Health does not claim that email and storage are configured.

No initial root lockfile could be generated in the restricted agent session because several packages were unavailable offline. Run `npm install` with registry access, then commit `package-lock.json`; use `npm ci` afterwards. The committed Expo versions follow SDK 57's published compatibility list. Run `npx expo install --check` from `apps/mobile` after installation.

## Credentials to provide later

Keep credentials in ignored environment files, not in Git or client code.

| Service           | Server environment                                                     |
| ----------------- | ---------------------------------------------------------------------- |
| PostgreSQL / Neon | `DATABASE_URL` (Neon URL must use TLS)                                 |
| Authentication    | `AUTH_SECRET` (at least 32 random characters)                          |
| Cloudinary        | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Mailtrap SMTP     | `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASSWORD` |
| Resend            | `RESEND_API_KEY`, `EMAIL_FROM` (verified sender in production)         |
| Client            | `EXPO_PUBLIC_API_URL` (reachable from the device)                      |

Development defaults to Mailtrap's SMTP sandbox, where codes appear in the captured inbox. Set `EMAIL_PROVIDER=resend` for Resend; production validation requires Resend and a configured sender. Automated tests inject an in-memory email provider and do not send messages externally.

All Cloudinary assets are uploaded as authenticated `raw` resources. Ensure the account permits the file formats you intend to store, including PDF/document delivery. The app receives a five-minute signed download URL only after ownership checks. See [security](SECURITY.md) for storage limits and extraction scope.

## Device networking

The API binds to `0.0.0.0`. An Android emulator reaches a host API through `10.0.2.2`; a physical phone uses the development machine's LAN address. `localhost` refers to the device itself. Production uses an HTTPS URL.

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` accordingly, then restart Expo. For browser access from another hostname, include the browser's exact origin in the server's comma-separated `CORS_ORIGINS`. Only the API URL belongs in an `EXPO_PUBLIC_*` value.

## PostgreSQL and migrations

`npm run db:up` starts PostgreSQL 17 on loopback port 5432 with a named Docker volume. `npm run db:down` stops it without deleting the volume. The API does not apply migrations automatically.

Versioned SQL lives in `apps/server/drizzle`. The migration runner serializes execution, checks previously applied checksums, and applies pending files atomically. Create a new migration to change a deployed schema. Drizzle's schema powers typed queries and `npm run db:studio`; keep it in sync with reviewed SQL migrations. PostgreSQL must support the `pg_trgm` extension.

For Neon, set the production `DATABASE_URL` to the pooled connection URL with `sslmode=require` (or `verify-full`). Apply migrations with the production environment configured before starting the API. Production also requires `NODE_ENV=production`, persistent random `AUTH_SECRET`, HTTPS web origins, Resend, and Cloudinary. Hosting is not provisioned by this project.

## Verification commands

```sh
npm run typecheck
npm test
npm run format:check
npm run build:web
```

The default tests include PGlite PostgreSQL service tests, which do not need Docker or provider credentials. For complete HTTP integration with node-postgres:

```sh
npm run test:db:up
npm run test:integration
```

The server example sets `TEST_DATABASE_URL` to the disposable `organize_test` database on port 5433. The integration harness refuses database names that do not end in `_test` and deletes only its own fixtures. CI uses a PostgreSQL service and runs the same API suite. See [verification evidence](VERIFICATION.md) for checks actually executed in this session.

## Local commits

The user handles pushing. If the agent session still protects `.git`, run this from a normal PowerShell terminal to create separate local commits:

```powershell
pwsh -File scripts/commit-work.ps1
```

The script stages explicit paths, excludes ignored credentials, stops on the first Git error, skips unchanged groups on reruns, and never pushes. It requires an initially empty staging index. Commit groups are listed in [COMMITS.md](COMMITS.md).

## Sources

- [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Drizzle PostgreSQL guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Cloudinary authenticated assets](https://cloudinary.com/documentation/control_access_to_media)
- [Mailtrap SMTP documentation](https://docs.mailtrap.io/)
- [Resend Node.js documentation](https://resend.com/docs/send-with-nodejs)
