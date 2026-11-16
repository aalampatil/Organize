import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { folderInputSchema, type Folder } from '@organize/contracts';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { colors, folderColors } from '../../theme/tokens';
import { errorMessage } from '../../lib/errors';
import { useLibraryActions } from '../library/useLibrary';
import { FolderPicker } from './FolderPicker';

export function FolderEditor({
  folder,
  parentId,
  folders,
  onClose,
  onDeleted,
}: {
  folder?: Folder;
  parentId: string | null;
  folders: Folder[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(folder?.name ?? '');
  const [parent, setParent] = useState(folder?.parentId ?? parentId);
  const [color, setColor] = useState<Folder['color']>(folder?.color ?? 'sage');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actions = useLibraryActions();
  const busy = actions.saveFolder.isPending || actions.deleteFolder.isPending;
  const save = async () => {
    setError(null);
    try {
      const input = folderInputSchema.parse({ name, parentId: parent, color });
      await actions.saveFolder.mutateAsync({ id: folder?.id, input });
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  const remove = async () => {
    if (!folder) return;
    setError(null);
    try {
      await actions.deleteFolder.mutateAsync(folder.id);
      onDeleted();
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  return (
    <Sheet
      title={folder ? 'Edit folder' : 'A little more organized'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Field
        label="Folder name"
        placeholder="Give it a home"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <FolderPicker folders={folders} value={parent} onChange={setParent} exclude={folder?.id} />
      <View style={{ gap: 10 }}>
        <Text style={styles.label}>A touch of color</Text>
        <View style={styles.colors}>
          {(Object.keys(folderColors) as Folder['color'][]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={value}
              accessibilityState={{ checked: color === value }}
              onPress={() => setColor(value)}
              style={[
                styles.color,
                {
                  backgroundColor: folderColors[value],
                  borderColor: color === value ? colors.sage : 'transparent',
                },
              ]}
            >
              {color === value && <Icon name="check" size={16} color={colors.sage} />}
            </Pressable>
          ))}
        </View>
      </View>
      <ErrorMessage message={error} />
      <Button
        title={folder ? 'Save changes' : 'Create folder'}
        icon="folder-plus"
        busy={busy}
        onPress={() => {
          void save();
        }}
      />
      {folder &&
        (confirmDelete ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.label}>
              Delete this empty folder? Items in Trash also need to be moved first.
            </Text>
            <Button
              title="Delete folder"
              variant="danger"
              disabled={busy}
              onPress={() => {
                void remove();
              }}
            />
            <Button title="Keep folder" variant="ghost" onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Button
            title="Delete folder"
            variant="ghost"
            icon="trash-2"
            onPress={() => setConfirmDelete(true)}
          />
        ))}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  colors: { flexDirection: 'row', gap: 14 },
  color: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
