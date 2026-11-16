import { z } from 'zod';
import { createDatabase } from './connection.js';
import { applyMigrations } from './migrations.js';

const url = z.url().parse(process.env.DATABASE_URL);
const { pool } = createDatabase(url);
try {
  await applyMigrations(pool);
  console.info('Database migrations applied.');
} finally {
  await pool.end();
}
