import { Pool } from 'pg';

const connectionString = process.env.REQUEST_DB_URL;

if (!connectionString) {
  throw new Error('REQUEST_DB_URL is missing from environment variables');
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('[request-service] Unexpected database error:', error);
});

export async function testDatabaseConnection(): Promise<void> {
  const result = await pool.query('SELECT NOW() AS current_time');

  console.log(
    '[request-service] Database connected:',
    result.rows[0].current_time,
  );
}