# Organize

A personal library for notes, PDFs, images, documents, and anything worth finding again. Built for iOS, Android, and web with a search-first Expo interface.

## Project status

The Expo client and Node API are implemented, with a sample workspace available from the sign-in screen. Credentials and final runtime checks remain pending. Documentation was written before application code. See [the implementation plan](docs/PLAN.md), [verification results](docs/VERIFICATION.md), [architecture](docs/ARCHITECTURE.md), and [setup](docs/SETUP.md).

## Get started

Use Node.js 24 LTS and Docker Desktop. From the repository root:

```sh
npm install
npm run setup
npm run db:up
npm run db:migrate
npm run dev:api
```

In a second terminal, run `npm run dev:mobile` for Expo or `npm run dev:web` for the browser. Fill in Mailtrap and Cloudinary values in `apps/server/.env` for real sign-in and uploads. The sample workspace works without these credentials. See [setup](docs/SETUP.md) for device URLs, Neon, Resend, and test commands.

## Stack

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| Client         | Expo SDK 57, React Native, TypeScript                      |
| API            | Node.js, TypeScript, Fastify, Zod                          |
| Database       | PostgreSQL and Drizzle; Docker locally, Neon in production |
| Files          | Cloudinary, private authenticated assets                   |
| Authentication | Email and one-time code; revocable opaque sessions         |
| Email          | Mailtrap SMTP in development, Resend in production         |

## Repository map

```text
apps/
  mobile/                 Expo application
    src/
      components/         Reusable UI
      features/           Auth, library, folders, notes, files
      hooks/              Shared hooks
      lib/                API client, session storage, configuration
      theme/              Colors, spacing, typography
  server/                 Fastify API
    drizzle/              Versioned SQL migrations
    src/
      config/             Validated environment
      db/                 Drizzle schema, connection, migrations
      lib/                Errors and security helpers
      modules/            Feature routes, services, repositories
      providers/          Email, Cloudinary, content extraction
packages/
  contracts/              Shared request validation and response types
docs/                     Requirements, architecture, API, setup, progress
scripts/                  Environment setup and separated local commits
```

## Working agreements

- Keep routes, business logic, database queries, and UI separate.
- Keep components small and hooks focused. Use descriptive names and strict TypeScript.
- Validate input at API boundaries. Scope every library query to the authenticated owner.
- Never commit credentials, OTPs, session tokens, uploads, or local database data.
- Run the relevant checks before committing. Keep the lockfile and migration history tracked.
- Commit documentation, tooling, data model, auth, features, UI, and verification as separate reviewable changes.

The initial implementation is saved in fifteen separate local commits, with new commits for follow-up fixes. The user handles pushing. See [commit history](docs/COMMITS.md); `scripts/commit-work.ps1` provides the original group boundaries and never pushes.

## Scope

Email OTP sign-in; nested folders; editable notes; file uploads; tags; favorites; trash and restore; global search across titles, filenames, note bodies, extracted PDF/text content, and tags. See [requirements](docs/REQUIREMENTS.md) for acceptance criteria and explicit limits.
