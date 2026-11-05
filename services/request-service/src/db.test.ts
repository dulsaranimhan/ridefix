import { pool } from './db';

describe('Request Service database connection', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('connects to the shared RideFix database', async () => {
    const result = await pool.query(
      'SELECT current_database() AS database, PostGIS_Version() AS postgis_version',
    );

    expect(result.rows[0].database).toBe('ridefix_db');
    expect(result.rows[0].postgis_version).toContain('3.5');
  });
});
