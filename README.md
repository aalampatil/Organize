# Organize

A personal library for notes, PDFs, images, documents, and anything worth finding again. Built for iOS, Android, and web with a search-first Expo interface.

## Project status

Documentation and implementation plan come first. See [the implementation plan](docs/PLAN.md) for progress, [architecture](docs/ARCHITECTURE.md) for boundaries, and [setup](docs/SETUP.md) for local services and credentials. Each completed, coherent change receives its own conventional commit.

## Stack

| Layer | Technology |
| --- | --- |
| Client | Expo SDK 57, React Native, TypeScript |
| API | Node.js, TypeScript, Fastify |
| Database | PostgreSQL and Drizzle; Docker locally, Neon in production |
| Files | Cloudinary, private authenticated assets |
| Authentication | Email and one-time code; revocable opaque sessions |
| Email | Mailtrap SMTP in development, Resend in production |

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
```

## Working agreements

- Keep routes, business logic, database queries, and UI separate.
- Keep components small and hooks focused. Use descriptive names and strict TypeScript.
- Validate input at API boundaries. Scope every library query to the authenticated owner.
- Never commit credentials, OTPs, session tokens, uploads, or local database data.
- Run the relevant checks before committing. Keep the lockfile and migration history tracked.
- Commit documentation, tooling, data model, auth, features, UI, and verification as separate reviewable changes.

## Scope

Email OTP sign-in; nested folders; editable notes; file uploads; tags; favorites; trash and restore; global search across titles, filenames, note bodies, extracted PDF/text content, and tags. See [requirements](docs/REQUIREMENTS.md) for acceptance criteria and explicit limits.
