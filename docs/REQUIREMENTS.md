# Product requirements

## Goal

Find saved information without remembering its folder or save date. Search is the primary entry point; folders and tags offer optional structure.

## Core flows

1. Enter an email, receive a six-digit code, and sign in. The same flow creates an account on first verification.
2. Open a library with prominent search, type filters, favorites, recent items, and a clear add action.
3. Create and edit a plain-text note with a title, body, optional folder, and tags.
4. Choose a document or image and upload it to Cloudinary. Save metadata in PostgreSQL and extract searchable text for supported formats.
5. Create folders and nested subfolders, navigate breadcrumbs, rename folders, and move items.
6. Search globally by title, filename, text, or tag. Combine search with type, folder, tag, or favorite filters.
7. Open an item, edit metadata, mark it as a favorite, move it to trash, or restore it.
8. Sign out and revoke the session.

## Acceptance criteria

- No navigation path is required to search the whole library.
- Search and browse requests are debounced, bounded, and owner-scoped.
- Empty, loading, network-error, and invalid-input states have clear feedback.
- Folder relationships cannot form cycles or reference another user's folders.
- Notes remain searchable immediately after saving.
- File content search covers text, Markdown, CSV, JSON, and text-based PDFs. DOCX extraction is included if supported safely; scanned PDFs and image OCR are deferred and described honestly in the UI.
- Private file access requires a valid session and generates an expiring access URL.
- OTPs expire, have a bounded attempt count and resend cooldown, and are stored only as keyed hashes.
- Sessions use random bearer tokens, hash-only storage, expiry, and server-side revocation.
- Secrets stay on the server. The Expo client contains only a public API base URL.
- Local services can run without production credentials; email delivery and real Cloudinary uploads are tested once credentials are supplied.

## Initial limits

- Personal accounts; no sharing, teams, collaboration, or public links.
- Online-first; no offline synchronization or conflict resolution.
- Plain-text notes with a comfortable writing surface; rich text is deferred.
- File upload size and extraction bounds are enforced on the server.
- Trash retains metadata and private assets until permanent deletion is explicitly requested.
- Production hosting, native store releases, and paid service provisioning are outside the initial local build.
