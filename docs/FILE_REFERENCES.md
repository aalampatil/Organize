# Link existing files

Choose **Upload file** to store a private copy in Organize, or **Link existing file** to save a reference to an original document. Linking sends only its filename, MIME type, byte size, folder, and tags to the API. The client keeps access permissions locally. It never uploads or extracts the linked file's contents, and it never copies the original into app storage.

## Organize and find

Open a folder before linking to place the reference there, then edit its title and tags. Projects, topics, and events can use the existing nested folders and tags, regardless of the original file's creation date or physical location. Global search finds references by title, filename, and tags. File/PDF/image filters, favorites, Trash, and restore also work with references. Storage totals count uploaded bytes only.

The **Linked file** label distinguishes references from uploads. Use the quick-open action on a card, or open its details for access status and **Reconnect file**. Organize reads the current original when opening; it does not keep a content snapshot.

## Platform support

| Environment                                                         | Selection and persistence                                                                                                                                 | Opening and limits                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supported desktop Chrome/Edge, HTTPS or localhost                   | User-selected File System Access handle, saved with metadata in IndexedDB under the signed-in user's ID and item ID                                       | Opens a sandboxed local browser preview. The browser may ask for read permission again. Browsers cannot launch arbitrary native apps or open unrestricted `file://` paths. Formats without browser previews must be opened from their original device location. |
| Android development/production build                                | System document picker in open mode with persistent URI permission; only the bookmark/URI and metadata are saved in the app's private documents directory | Checks availability and asks the OS to view the original with read permission. A compatible viewer and a document provider supporting persistent access are required.                                                                                           |
| iOS development/production build                                    | System document picker in open mode; a security-scoped bookmark and metadata are saved in the app's private documents directory                           | The native viewer resolves the bookmark within a security scope and previews the original with Quick Look. Availability is checked on open.                                                                                                                     |
| Expo Go                                                             | Native persistent document picker/viewer modules are unavailable                                                                                          | Explains that a native build or supported desktop browser is needed. Upload remains available.                                                                                                                                                                  |
| Browsers without File System Access, including most mobile browsers | Persistent linking is unavailable                                                                                                                         | Explains the limitation before selection and offers upload or a supported device.                                                                                                                                                                               |

Organize never sends handles or bookmarks to its API. Metadata appears on other signed-in devices, but each device/browser profile needs its own connection. Clearing browser/app data, changing the site origin or browser profile, reinstalling, or losing provider permissions can require reconnecting. OS-managed app backups may contain local descriptors; restored connections can require reconnecting. Signing out clears in-memory account state; saved connections remain locally scoped to that account so signing back in can reuse them. No background scan or automatic cloud synchronization of local contents is performed.

## Missing files and reconnecting

The library checks browser handle permissions/availability and Android URI availability when loading a reference and after attempting to open it. iOS checks by resolving the bookmark on open. If a file is missing, access is denied, or the connection exists only on another device, the UI explains the issue and offers reconnecting. An OS handle/bookmark may continue to work after a rename or move; otherwise, select the file at its new location.

**Reconnect file** explicitly selects a replacement location. It updates filename, MIME type, and size while keeping the item's ID, title, folder, tags, favorite, and creation date. Canceling selection changes nothing. Organize does not search the whole device or silently substitute a file with the same name.

Moving a reference to Trash retains its connection for restore. Permanently deleting a reference removes its metadata and this device's connection, leaving the original untouched. Android URI permissions are released only when no locally stored reference uses that URI. Deletion on another device cannot remotely revoke local OS grants; stale local records may remain until app data is cleared.

## Setup

Apply the additive migration before running the updated API:

```sh
npm ci
npm run db:migrate
```

Migration `0002_file_references.sql` marks existing files as uploads and allows references with no storage ID, including zero-byte originals. Migrations are explicit and never run automatically at startup.

Native linking requires rebuilding after installing dependencies; restarting Expo Go is insufficient. On an Android development machine, run `npx expo run:android` from `apps/mobile`. On macOS with Xcode, use `npx expo run:ios`. React Native autolinks `@react-native-documents/picker` and `@react-native-documents/viewer`; `expo-file-system` stores only local connection descriptors. No broad device-storage permission is requested.

## Verification and sources

The browser regression substitutes only the picker boundary with real Origin Private File System handles. It exercises structured-clone persistence in IndexedDB, reloads, reading modified original content, removal, reconnecting, another browser profile with no connection, and deletion that leaves the replacement original intact. HTTP/service suites cover validation, owner isolation, zero-byte references, search, organization preservation, and avoiding storage-provider operations. Native JavaScript/Hermes exports check bundling; Android/iOS physical-device testing remains required.

Platform behavior follows [MDN's file picker documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker), [saved-handle permissions](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission), the native libraries' [open-mode and lasting-access guide](https://react-native-documents.github.io/docs/sponsor-only/picker/open-mode), and [document viewer guide](https://react-native-documents.github.io/docs/sponsor-only/viewer).
