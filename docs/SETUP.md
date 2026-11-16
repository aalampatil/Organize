# Setup and credentials

Detailed runnable commands will be added as tooling lands. Target Node.js 24 LTS, npm workspaces, Docker Desktop, and Expo SDK 57. PostgreSQL runs in Docker locally and Neon in production.

## Credentials to provide later

Keep credentials in ignored environment files, not in Git or client code.

| Service | Server environment |
| --- | --- |
| PostgreSQL / Neon | `DATABASE_URL` (Neon URL must use TLS) |
| Authentication | `AUTH_SECRET` (at least 32 random characters) |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Mailtrap SMTP | `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASSWORD` |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` (verified sender in production) |
| Client | `EXPO_PUBLIC_API_URL` (reachable from the device) |

Development selects Mailtrap; production selects Resend. Do not send test messages to real addresses until email credentials and sender configuration are ready. An explicit test-only provider may capture mail in memory during automated tests.

## Device networking

The API binds to `0.0.0.0`. An Android emulator reaches a host API through `10.0.2.2`; a physical phone uses the development machine's LAN address. `localhost` refers to the device itself. Production uses an HTTPS URL.

## Sources

- [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Drizzle PostgreSQL guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Cloudinary authenticated assets](https://cloudinary.com/documentation/control_access_to_media)
- [Mailtrap SMTP documentation](https://docs.mailtrap.io/)
- [Resend Node.js documentation](https://resend.com/docs/send-with-nodejs)
