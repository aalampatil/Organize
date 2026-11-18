import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import type { Item } from '@organize/contracts';
import { useSession } from '../auth/SessionProvider';
import { errorMessage } from '../../lib/errors';
import {
  checkDeviceFile,
  discardDeviceFile,
  openDeviceFile,
  pickDeviceFile,
  readDeviceFile,
  referenceSupport,
  saveDeviceFile,
  removeDeviceFile,
} from './device-files';

export function useDeviceReference(item: Item) {
  const { user, api } = useSession();
  const client = useQueryClient();
  const key = ['device-file', user?.id, item.id];
  const local = useQuery({
    queryKey: [...key, item.file?.filename, item.file?.mimeType, item.file?.bytes],
    queryFn: async () => {
      let file = await readDeviceFile(user!.id, item.id);
      if (
        file &&
        (file.metadata.filename !== item.file?.filename ||
          file.metadata.bytes !== item.file.bytes ||
          file.metadata.mimeType !== item.file.mimeType)
      )
        file = null;
      return { file, status: file ? await checkDeviceFile(file) : ('missing' as const) };
    },
    enabled: Boolean(user),
    retry: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async () => {
    if (!local.data?.file || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Use the already-loaded record to preserve browser user activation.
      await openDeviceFile(local.data.file);
    } catch (cause) {
      const detail = errorMessage(cause);
      setError(
        `${detail} If the file moved, was renamed or deleted, or access changed, reconnect it below.`,
      );
    } finally {
      setBusy(false);
      void local.refetch();
    }
  };
  const reconnect = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const selected = await pickDeviceFile();
      if (!selected) return;
      try {
        // Keep the prior grant alive until both the local save and API change succeed.
        await saveDeviceFile(user.id, item.id, selected);
        try {
          await api.reconnectReference(item.id, selected.metadata);
        } catch (cause) {
          if (local.data?.file) await saveDeviceFile(user.id, item.id, local.data.file);
          else await removeDeviceFile(user.id, item.id);
          throw cause;
        }
        if (local.data?.file) await discardDeviceFile(local.data.file);
      } finally {
        await discardDeviceFile(selected);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['library'] }),
        client.invalidateQueries({ queryKey: key }),
      ]);
    }
  };
  const unsupported = referenceSupport();
  const status = local.data?.status;
  const message =
    unsupported ??
    (local.isError
      ? 'The saved connection could not be read on this device. Reconnect the file to restore access.'
      : status === 'missing'
        ? 'File unavailable here. It may have moved, been renamed or deleted, or been linked on another device. Reconnect to its current location.'
        : status === 'permission'
          ? 'Permission is needed. Allow access when opening this file, or reconnect it.'
          : status === 'ready'
            ? 'Connected on this device. Opening reads the current original file.'
            : 'Access will be checked when you open the original file.');
  return {
    open,
    reconnect,
    message,
    error,
    busy,
    loading: local.isPending,
    canOpen: Boolean(local.data?.file) && status !== 'missing' && !unsupported,
    openTitle: Platform.OS === 'web' ? 'Open local preview' : 'Open original file',
    unsupported,
  };
}
