
import { readPort } from '@ridefix/service-kit';
import { buildApp, SERVICE_NAME } from './app';
import { testDatabaseConnection } from './db';

const port = readPort('BIDDING_SERVICE_PORT', 4003);

async function startServer() {
  try {
    await testDatabaseConnection();

    buildApp().listen(port, () => {
      console.log(`[${SERVICE_NAME}] listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[bidding-service] Failed to start:', error);
    process.exit(1);
  }
}

startServer();
