import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

/** Apply reviewed SQL atomically; reject edits to previously applied migrations. */
export async function applyMigrations(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('organize:migrations'))");
    await client.query(
      'CREATE TABLE IF NOT EXISTS organize_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const directory = new URL('../../drizzle/', import.meta.url);
    const names = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    for (const name of names) {
      const source = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(source).digest('hex');
      const previous = await client.query<{ checksum: string }>(
        'SELECT checksum FROM organize_migrations WHERE name = $1',
        [name],
      );
      if (previous.rows[0]) {
        if (previous.rows[0].checksum !== checksum)
          throw new Error(`Applied migration was changed: ${name}`);
        continue;
      }
      await client.query(source);
      await client.query('INSERT INTO organize_migrations (name, checksum) VALUES ($1, $2)', [
        name,
        checksum,
      ]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
