import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { itemUpdateSchema, noteInputSchema, type Folder, type Item } from '@organize/contracts';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import { Button } from '../../components/Button';
import { ErrorMessage, Loading } from '../../components/Feedback';
import { colors } from '../../theme/tokens';
import { formatBytes } from '../../lib/format';
import { errorMessage } from '../../lib/errors';
import { useSession } from '../auth/SessionProvider';
import { useLibraryActions } from '../library/useLibrary';
import { FolderPicker } from '../folders/FolderPicker';
import { ReferenceAccess } from '../files/ReferenceAccess';

export function ItemSheet({
  id,
  folderId,
  folders,
  onClose,
}: {
  id?: string;
  folderId: string | null;
  folders: Folder[];
  onClose: () => void;
}) {
  const { api } = useSession();
  const item = useQuery({
    queryKey: ['library', 'item', id],
    queryFn: () => api.item(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });
  if (id && item.isPending)
    return (
      <Sheet title="Opening item" onClose={onClose}>
        <Loading />
      </Sheet>
    );
  if (id && item.isError)
    return (
      <Sheet title="Could not open item" onClose={onClose}>
        <ErrorMessage message={errorMessage(item.error)} />
        <Button
          title="Try again"
          onPress={() => {
            void item.refetch();
          }}
        />
      </Sheet>
    );
  return (
    <ItemEditor
      key={id ?? 'new'}
      item={item.data}
      folderId={folderId}
      folders={folders}
      onClose={onClose}
    />
  );
}
function ItemEditor({
  item,
  folderId,
  folders,
  onClose,
}: {
  item?: Item;
  folderId: string | null;
  folders: Folder[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [tags, setTags] = useState(item?.tags.join(', ') ?? '');
  const [folder, setFolder] = useState(item ? item.folderId : folderId);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'discard' | null>(null);
  const actions = useLibraryActions();
  const isNote = !item || item.kind === 'note';
  const busy =
    actions.saveNote.isPending ||
    actions.update.isPending ||
    actions.deleteItem.isPending ||
    actions.download.isPending;
  const dirty =
    title !== (item?.title ?? '') ||
    body !== (item?.body ?? '') ||
    tags !== (item?.tags.join(', ') ?? '') ||
    folder !== (item ? item.folderId : folderId);
  const run = async (action: () => Promise<unknown>, close = true) => {
    setError(null);
    try {
      await action();
      if (close) onClose();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  const save = () =>
    run(async () => {
      const fields = {
        title,
        folderId: folder,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      if (isNote)
        await actions.saveNote.mutateAsync({
          id: item?.id,
          input: noteInputSchema.parse({ ...fields, body }),
        });
      else
        await actions.update.mutateAsync({ id: item!.id, input: itemUpdateSchema.parse(fields) });
    });
  const download = () =>
    run(async () => {
      if (!item) return;
      const result = await actions.download.mutateAsync(item.id);
      await Linking.openURL(result.url);
    }, false);
  const close = () => {
    if (busy) return;
    if (dirty) setConfirm('discard');
    else onClose();
  };
  return (
    <Sheet
      title={
        item?.trashedAt
          ? 'In your trash'
          : isNote
            ? item
              ? 'Your note'
              : 'Make room for an idea'
            : 'File details'
      }
      onClose={close}
    >
      <Field
        label="Title"
        placeholder="Untitled thought"
        value={title}
        onChangeText={setTitle}
        maxLength={180}
        editable={!item?.trashedAt}
      />
      {isNote ? (
        <Field
          label="Note"
          placeholder="Start with a thought…"
          value={body}
          onChangeText={setBody}
          multiline
          editable={!item?.trashedAt}
          maxLength={200000}
          style={styles.body}
        />
      ) : (
        <View style={styles.file}>
          <Text style={styles.filename}>{item!.file!.filename}</Text>
          <Text style={styles.caption}>
            {formatBytes(item!.file!.bytes)} · {item!.file!.mimeType}
          </Text>
          {item!.file!.source === 'reference' ? (
            item?.trashedAt ? (
              <Text style={styles.caption}>
                Linked file reference. Restoring or deleting this reference leaves the original file
                untouched.
              </Text>
            ) : (
              <ReferenceAccess item={item!} />
            )
          ) : (
            <>
              <Text style={styles.caption}>
                {item!.file!.extractionStatus === 'ready'
                  ? 'Text is searchable. PDF indexing covers the first 50 pages and up to 200,000 characters.'
                  : item!.file!.extractionStatus === 'failed'
                    ? 'Text could not be extracted. You can still find this file by title, filename, and tags.'
                    : 'Find this file by title, filename, and tags. Image OCR and this format’s contents are not indexed.'}
              </Text>
              {!item?.trashedAt && (
                <Button
                  title="Open / download file"
                  icon="download"
                  variant="secondary"
                  busy={actions.download.isPending}
                  onPress={() => {
                    void download();
                  }}
                />
              )}
            </>
          )}
        </View>
      )}
      {!item?.trashedAt && (
        <>
          <Field
            label="Tags · separate with commas"
            value={tags}
            onChangeText={setTags}
            autoCapitalize="none"
            placeholder="ideas, work, personal"
          />
          <FolderPicker folders={folders} value={folder} onChange={setFolder} />
        </>
      )}
      <ErrorMessage message={error} />
      {confirm === 'discard' ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.caption}>You have unsaved changes.</Text>
          <Button title="Keep writing" variant="secondary" onPress={() => setConfirm(null)} />
          <Button title="Discard changes" variant="danger" onPress={onClose} />
        </View>
      ) : confirm === 'delete' ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.caption}>
            {item?.file?.source === 'reference'
              ? 'Delete this reference permanently? The original file on your device will remain untouched.'
              : 'Permanently delete this item and its file? This cannot be undone.'}
          </Text>
          <Button
            title="Delete permanently"
            variant="danger"
            busy={busy}
            onPress={() => {
              void run(() =>
                actions.deleteItem.mutateAsync({
                  id: item!.id,
                  reference: item?.file?.source === 'reference',
                }),
              );
            }}
          />
          <Button title="Keep in Trash" variant="ghost" onPress={() => setConfirm(null)} />
        </View>
      ) : item?.trashedAt ? (
        <>
          <Button
            title="Restore item"
            icon="rotate-ccw"
            busy={busy}
            onPress={() => {
              void run(() =>
                actions.update.mutateAsync({ id: item.id, input: { trashed: false } }),
              );
            }}
          />
          <Button
            title="Delete permanently"
            variant="danger"
            icon="trash-2"
            disabled={busy}
            onPress={() => setConfirm('delete')}
          />
        </>
      ) : (
        <>
          <Button
            title={item ? 'Save changes' : 'Save note'}
            icon="check"
            busy={busy}
            onPress={() => {
              void save();
            }}
          />
          {item && (
            <View style={styles.actions}>
              <Button
                title={item.favorite ? 'Unfavorite' : 'Favorite'}
                icon="star"
                variant="ghost"
                disabled={busy}
                onPress={() => {
                  void run(() =>
                    actions.update.mutateAsync({
                      id: item.id,
                      input: { favorite: !item.favorite },
                    }),
                  );
                }}
              />
              <Button
                title="Move to Trash"
                icon="trash-2"
                variant="ghost"
                disabled={busy}
                onPress={() => {
                  void run(() =>
                    actions.update.mutateAsync({ id: item.id, input: { trashed: true } }),
                  );
                }}
              />
            </View>
          )}
        </>
      )}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  body: {
    minHeight: 230,
    fontSize: 16,
    lineHeight: 27,
    backgroundColor: colors.note,
    borderColor: '#EDE6D4',
  },
  file: { padding: 20, borderRadius: 16, backgroundColor: colors.sageLight, gap: 12 },
  filename: { fontSize: 16, fontWeight: '600', color: colors.ink },
  caption: { fontSize: 13, lineHeight: 21, color: colors.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
