import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readPort } from '@ridefix/service-kit';
import { buildApp, SERVICE_NAME } from './app';
import { pool } from './db';
import { jwtSecret } from './tokens';

const port = readPort('AUTH_SERVICE_PORT', 4007);

// Fail at startup, not on the first login, when JWT_SECRET is missing.
jwtSecret();

async function applyMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = resolve(__dirname, '../migrations');
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  for (const filename of files) {
    const existing = await pool.query(
      'SELECT 1 FROM auth_schema_migrations WHERE filename = $1',
      [filename],
    );
    if (existing.rowCount) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(resolve(migrationsDir, filename), 'utf8'));
      await client.query('INSERT INTO auth_schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

void applyMigrations()
  .then(() => {
    buildApp().listen(port, () => {
      console.log(`[${SERVICE_NAME}] listening on http://localhost:${port}`);
    });
  })
  .catch(async (error: unknown) => {
    console.error(`[${SERVICE_NAME}] database migration failed`, error);
    await pool.end();
    process.exitCode = 1;
  });
