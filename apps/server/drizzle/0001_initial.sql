CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE otp_challenges (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'sage',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT folders_id_owner_unique UNIQUE (id, user_id),
  CONSTRAINT folders_parent_owner_fk FOREIGN KEY (parent_id, user_id) REFERENCES folders(id, user_id),
  CONSTRAINT folders_not_self_parent CHECK (id <> parent_id)
);
CREATE INDEX folders_owner_parent_idx ON folders(user_id, parent_id);

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('note', 'file')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  extracted_text text NOT NULL DEFAULT '',
  folder_id uuid,
  tags text[] NOT NULL DEFAULT '{}',
  favorite boolean NOT NULL DEFAULT false,
  trashed_at timestamptz,
  filename text,
  mime_type text,
  bytes bigint,
  storage_id text,
  extraction_status text CHECK (extraction_status IN ('ready', 'unsupported', 'failed')),
  search_text text NOT NULL DEFAULT '',
  search_vector tsvector NOT NULL DEFAULT ''::tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT items_folder_owner_fk FOREIGN KEY (folder_id, user_id) REFERENCES folders(id, user_id),
  CONSTRAINT items_file_metadata_check CHECK (kind = 'note' OR (filename IS NOT NULL AND mime_type IS NOT NULL AND bytes > 0 AND storage_id IS NOT NULL AND extraction_status IS NOT NULL))
);
CREATE INDEX items_owner_recent_idx ON items(user_id, updated_at DESC);
CREATE INDEX items_owner_folder_idx ON items(user_id, folder_id);
CREATE INDEX items_search_vector_idx ON items USING gin(search_vector);
CREATE INDEX items_search_text_idx ON items USING gin(search_text gin_trgm_ops);
CREATE INDEX items_tags_idx ON items USING gin(tags);

CREATE FUNCTION update_item_search() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_text := concat_ws(' ', NEW.title, NEW.filename, NEW.body, NEW.extracted_text, array_to_string(NEW.tags, ' '));
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '') || ' ' || coalesce(NEW.filename, '') || ' ' || array_to_string(NEW.tags, ' ')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.body, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.extracted_text, '')), 'C');
  RETURN NEW;
END;
$$;
CREATE TRIGGER items_search_update BEFORE INSERT OR UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_item_search();
