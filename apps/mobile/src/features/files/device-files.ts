import { Platform, TurboModuleRegistry } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { referenceFileSchema } from '@organize/contracts';
import type { DeviceFile, DeviceFileStatus } from './device-files.types';

const directory = () => new Directory(Paths.document, 'file-references');
const recordFile = (userId: string, itemId: string) =>
  new File(directory(), `${userId}-${itemId}.json`);

export function referenceSupport(): string | null {
  if (!TurboModuleRegistry.get('RNDocumentPicker') || !TurboModuleRegistry.get('RNDocumentViewer'))
    return 'Linking original files requires an Organize development or production build. Expo Go does not include persistent document access. Upload a copy here, or use a supported desktop browser.';
  return null;
}
export async function pickDeviceFile(): Promise<DeviceFile | null> {
  const unsupported = referenceSupport();
  if (unsupported) throw new Error(unsupported);
  const picker = await import('@react-native-documents/picker');
  try {
    const [result] = await picker.pick({
      mode: 'open',
      requestLongTermAccess: true,
      allowMultiSelection: false,
    });
    if (!result) return null;
    try {
      if (result.bookmarkStatus !== 'success')
        throw new Error(
          'This file provider did not grant lasting access. Choose a file from a provider that supports linking, or upload a copy.',
        );
      if (result.error || result.size === null || !result.name)
        throw new Error(
          'This file provider could not read the file details. Choose another file or provider.',
        );
      return {
        metadata: referenceFileSchema.parse({
          filename: result.name,
          mimeType: result.type || 'application/octet-stream',
          bytes: result.size,
        }),
        access: {
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          uri: result.uri,
          bookmark: result.bookmark,
        },
      };
    } finally {
      // The viewer resolves the saved bookmark and manages its own security scope later.
      if (Platform.OS === 'ios') await picker.releaseSecureAccess([result.uri]);
    }
  } catch (error) {
    if (picker.isErrorWithCode(error) && error.code === picker.errorCodes.OPERATION_CANCELED)
      return null;
    throw error;
  }
}
export async function readDeviceFile(userId: string, itemId: string): Promise<DeviceFile | null> {
  const file = recordFile(userId, itemId);
  if (!file.exists) return null;
  return JSON.parse(await file.text()) as DeviceFile;
}
export async function saveDeviceFile(userId: string, itemId: string, file: DeviceFile) {
  directory().create({ intermediates: true, idempotent: true });
  recordFile(userId, itemId).write(JSON.stringify(file));
}
export async function removeDeviceFile(userId: string, itemId: string) {
  const previous = await readDeviceFile(userId, itemId);
  const file = recordFile(userId, itemId);
  if (file.exists) file.delete();
  if (previous) await discardDeviceFile(previous);
}
export async function discardDeviceFile(file: DeviceFile) {
  if (file.access.platform !== 'android') return;
  // Grants belong to a URI, not an item: another reference or account may still use it.
  for (const entry of directory().exists ? directory().list() : []) {
    if (!(entry instanceof File)) continue;
    const saved = JSON.parse(await entry.text()) as DeviceFile;
    if (saved.access.platform === 'android' && saved.access.uri === file.access.uri) return;
  }
  const { releaseLongTermAccess } = await import('@react-native-documents/picker');
  await releaseLongTermAccess([file.access.uri]);
}
export async function checkDeviceFile(file: DeviceFile): Promise<DeviceFileStatus> {
  if (file.access.platform === 'android') {
    try {
      return new File(file.access.uri).exists ? 'ready' : 'missing';
    } catch {
      return 'missing';
    }
  }
  // On iOS a bookmark must be resolved within a native security scope by the viewer.
  return 'unchecked';
}
export async function openDeviceFile(file: DeviceFile) {
  const unsupported = referenceSupport();
  if (unsupported) throw new Error(unsupported);
  if (file.access.platform !== 'ios' && file.access.platform !== 'android')
    throw new Error('Reconnect this file on this device.');
  if ((await checkDeviceFile(file)) === 'missing')
    throw new Error('The original file is missing or permission has expired. Reconnect the file.');
  const { viewDocument } = await import('@react-native-documents/viewer');
  await viewDocument({
    bookmark: file.access.bookmark,
    mimeType: file.metadata.mimeType,
    grantPermissions: 'read',
  });
}
