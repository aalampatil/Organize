import { envSchema } from './config/env.js';
import { createDatabase } from './db/connection.js';
import { buildApp } from './app.js';

const env = envSchema.parse(process.env);
const { db, pool } = createDatabase(env.DATABASE_URL);
const app = await buildApp(env, db);
app.addHook('onClose', async () => {
  await pool.end();
});
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await app.close();
}
process.on('SIGTERM', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown();
});
try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  await app.close();
  throw error;
}
