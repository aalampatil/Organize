-- Existing files remain uploaded assets. References contain metadata only.
ALTER TABLE items ADD COLUMN file_source text NOT NULL DEFAULT 'upload';
ALTER TABLE items ADD CONSTRAINT items_file_source_check CHECK (file_source IN ('upload', 'reference'));
ALTER TABLE items DROP CONSTRAINT items_file_metadata_check;
ALTER TABLE items ADD CONSTRAINT items_file_metadata_check CHECK (
  kind = 'note' OR (
    filename IS NOT NULL AND mime_type IS NOT NULL AND bytes IS NOT NULL AND extraction_status IS NOT NULL AND (
      (file_source = 'upload' AND bytes > 0 AND storage_id IS NOT NULL) OR
      (file_source = 'reference' AND bytes >= 0 AND storage_id IS NULL)
    )
  )
);
