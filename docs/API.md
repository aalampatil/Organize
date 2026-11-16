# API contract

The API listens on port 4000 by default. Requests and responses use JSON, except multipart file uploads. Zod schemas live in `packages/contracts/src`. All `/v1` routes require `Authorization: Bearer <token>` except the two code endpoints. Responses are marked `Cache-Control: no-store`.

| Method | Path                     | Purpose                                              |
| ------ | ------------------------ | ---------------------------------------------------- |
| GET    | `/health`                | Database readiness; returns 503 if unavailable       |
| POST   | `/v1/auth/request-code`  | `{ email }`; delivers a six-digit code               |
| POST   | `/v1/auth/verify-code`   | `{ email, code }`; returns token, user, expiry       |
| POST   | `/v1/auth/sign-out`      | Revoke current session; returns 204                  |
| GET    | `/v1/me`                 | Current user's ID and email                          |
| GET    | `/v1/folders`            | Owner's folder tree as a flat list                   |
| POST   | `/v1/folders`            | `{ name, parentId?, color? }`                        |
| PATCH  | `/v1/folders/:id`        | Rename, recolor, or move a folder                    |
| DELETE | `/v1/folders/:id`        | Delete an empty folder; nonempty returns 409         |
| GET    | `/v1/items`              | Search/browse a bounded page                         |
| GET    | `/v1/items/:id`          | Full item including note body                        |
| POST   | `/v1/notes`              | `{ title, body?, folderId?, tags? }`                 |
| PATCH  | `/v1/items/:id`          | Title, note body, folder, tags, favorite, or trashed |
| POST   | `/v1/files`              | Multipart `file` and optional JSON `metadata` field  |
| GET    | `/v1/items/:id/download` | Authorized signed URL, valid for five minutes        |
| DELETE | `/v1/items/:id`          | Permanently remove a trashed item and remote asset   |
| GET    | `/v1/tags`               | Owner's active tag facets with counts                |
| GET    | `/v1/stats`              | Active note/file/favorite counts and stored bytes    |

## Search parameters

`q` (up to 200 characters), `kind` (`note`, `file`, `image`, `pdf`), `folderId` (UUID or `root`), `tag`, `favorite` (`true`/`false`), `trash` (`true`/`false`), `sort` (`recent`, `oldest`, `title`), `limit` (1–50, default 30), and `offset` (0–100000). Boolean strings are parsed explicitly; `false` is never treated as truthy.

Search uses weighted PostgreSQL full-text ranking and literal partial matches through a trigram index. Title, original filename, tags, note body, and supported extracted text participate. Folder scope includes only direct items; global search includes all folders. Results return `{ items, total, nextOffset }`. Listing bodies/excerpts are shortened; request an individual item before editing.

## Errors

```json
{
  "error": {
    "code": "INVALID_CODE",
    "message": "The code is invalid or expired. Request a new code if needed."
  }
}
```

Invalid input returns 400; missing/expired sessions 401; inaccessible resources 404; conflicting deletion 409; oversized uploads 413; cooldown/rate limits 429; unconfigured services 503. Cross-owner IDs return the same resource-not-found response as nonexistent IDs.

## Limits

Codes expire in ten minutes, allow five guesses, and have a one-minute resend cooldown. Sessions expire after thirty days. Uploads default to 20 MiB and have a server-configurable limit up to 50 MiB. Text extraction stores up to 200,000 characters; PDFs cover the first fifty pages and run in a worker with a ten-second timeout. Unsupported formats retain title/filename/tag search. Images do not have OCR.
