import { Pool } from 'pg';

const connectionString = process.env.BIDDING_DB_URL;

if (!connectionString) {
  throw new Error('BIDDING_DB_URL environment variable is required');
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('[bidding-service] unexpected PostgreSQL pool error', error);
});
