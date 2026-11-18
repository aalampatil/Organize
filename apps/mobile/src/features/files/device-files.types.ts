import type { ReferenceFile } from '@organize/contracts';

// A minimal structural type also works with browsers whose TS DOM types omit permissions.
export type BrowserFileHandle = {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
  queryPermission: (options: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission: (options: { mode: 'read' }) => Promise<PermissionState>;
};
export type DeviceFile = {
  metadata: ReferenceFile;
  access:
    | { platform: 'web'; handle: BrowserFileHandle }
    | { platform: 'android' | 'ios'; uri: string; bookmark: string };
};
export type DeviceFileStatus = 'ready' | 'permission' | 'missing' | 'unchecked';
