import { referenceFileSchema } from '@organize/contracts';
import type { BrowserFileHandle, DeviceFile, DeviceFileStatus } from './device-files.types';

type PickerWindow = Window & {
  showOpenFilePicker?: (options: { multiple: boolean }) => Promise<BrowserFileHandle[]>;
};
const databaseName = 'organize-device-files';
const storeName = 'references';

export function referenceSupport(): string | null {
  if (!globalThis.isSecureContext || !(window as PickerWindow).showOpenFilePicker)
    return 'Linking requires a supported desktop browser (Chrome or Edge) over HTTPS or localhost. You can upload a copy here, or link from a supported device.';
  if (!globalThis.indexedDB)
    return 'Allow browser storage to remember linked files, or upload a copy instead.';
  return null;
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error('Browser storage is unavailable. Allow storage and reconnect this file.'));
    request.onblocked = () => reject(new Error('Close other Organize tabs and try again.'));
  });
}

async function stored<T>(
  userId: string,
  itemId: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, key: string) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName), `${userId}:${itemId}`);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () =>
        reject(
          new Error(
            'The file connection could not be saved on this browser. Allow storage and reconnect it.',
          ),
        );
    });
  } finally {
    db.close();
  }
}

export async function pickDeviceFile(): Promise<DeviceFile | null> {
  const unsupported = referenceSupport();
  if (unsupported) throw new Error(unsupported);
  try {
    // Must be the first asynchronous operation: the picker requires a user gesture.
    const [handle] = await (window as PickerWindow).showOpenFilePicker!({ multiple: false });
    if (!handle) return null;
    const file = await handle.getFile();
    const db = await database();
    db.close();
    return {
      metadata: referenceFileSchema.parse({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        bytes: file.size,
      }),
      access: { platform: 'web', handle },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

export async function saveDeviceFile(userId: string, itemId: string, file: DeviceFile) {
  // Structured cloning saves the handle and metadata, never a File or its bytes.
  await stored(userId, itemId, 'readwrite', (store, key) => store.put(file, key));
}
export async function readDeviceFile(userId: string, itemId: string): Promise<DeviceFile | null> {
  return (
    (await stored<DeviceFile | undefined>(userId, itemId, 'readonly', (store, key) =>
      store.get(key),
    )) ?? null
  );
}
export async function removeDeviceFile(userId: string, itemId: string) {
  await stored(userId, itemId, 'readwrite', (store, key) => store.delete(key));
}
export async function discardDeviceFile(_file: DeviceFile) {
  // The browser owns handle permissions. No copy or temporary file needs cleanup.
}
export async function checkDeviceFile(file: DeviceFile): Promise<DeviceFileStatus> {
  if (file.access.platform !== 'web') return 'missing';
  try {
    if ((await file.access.handle.queryPermission({ mode: 'read' })) !== 'granted')
      return 'permission';
    await file.access.handle.getFile();
    return 'ready';
  } catch (error) {
    return error instanceof DOMException && error.name === 'NotAllowedError'
      ? 'permission'
      : 'missing';
  }
}
export async function openDeviceFile(file: DeviceFile) {
  if (file.access.platform !== 'web') throw new Error('Reconnect this file on this device.');
  const { handle } = file.access;
  // Request immediately from the button gesture. Never prompt from a background check.
  const permission = handle.requestPermission({ mode: 'read' });
  // Handle rejection even if a blocked preview window stops the operation early.
  void permission.catch(() => {});
  const preview = window.open('about:blank', '_blank');
  if (!preview) throw new Error('Allow pop-ups to preview local files, then try again.');
  preview.opener = null;
  try {
    if ((await permission) !== 'granted')
      throw new Error(
        'File access was not allowed. Allow access when opening, or reconnect the file.',
      );
    const original = await handle.getFile();
    const url = URL.createObjectURL(original);
    preview.document.title = original.name;
    const description = preview.document.createElement('p');
    description.textContent = `${original.name} · Local preview. No file was uploaded. Browsers cannot launch the original in a desktop app. If this format cannot be previewed, open it from its original location on your device.`;
    preview.document.body.append(description);
    // Sandbox local HTML/SVG as well: file content must never execute in Organize's origin.
    const frame = preview.document.createElement('iframe');
    frame.setAttribute('sandbox', '');
    frame.title = original.name;
    frame.src = url;
    frame.style.cssText = 'width:100%;height:85vh;border:0';
    preview.document.body.append(frame);
    const timer = setInterval(() => {
      if (preview.closed) {
        URL.revokeObjectURL(url);
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    preview.close();
    throw error;
  }
}
