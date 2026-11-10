/**
 * Creates the first admin account. Run after auth-service has started once (it creates the table):
 *   ADMIN_EMAIL=admin@ridefix.lk ADMIN_PASSWORD='a-long-password' pnpm --filter auth-service seed:admin
 * Does nothing if that email already exists.
 */
import bcrypt from 'bcryptjs';
import { pool } from './db';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || 'RideFix Admin';

  if (!email || !password || password.length < 12) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters)');
  }

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, await bcrypt.hash(password, 10), fullName],
  );
  console.log(result.rowCount ? `Admin created: ${email}` : `Account already exists: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
