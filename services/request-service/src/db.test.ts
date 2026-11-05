// Integration test: needs a running PostGIS database. Skipped when REQUEST_DB_URL is not set.
const describeWithDatabase = process.env.REQUEST_DB_URL ? describe : describe.skip;

describeWithDatabase('Request Service database connection', () => {
  afterAll(async () => {
    const { pool } = jest.requireActual('./db');
    await pool.end();
  });

  it('connects to the shared RideFix database', async () => {
    const { pool } = jest.requireActual('./db');
    const result = await pool.query(
      'SELECT current_database() AS database, PostGIS_Version() AS postgis_version',
    );

    expect(result.rows[0].database).toBe('ridefix_db');
    expect(result.rows[0].postgis_version).toContain('3.5');
  });
});
