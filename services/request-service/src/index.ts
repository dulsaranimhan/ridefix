import { readPort } from '@ridefix/service-kit';
import { buildApp, SERVICE_NAME } from './app';
import { testDatabaseConnection } from './db';

const port = readPort('REQUEST_SERVICE_PORT', 4001);

async function startServer() {
  try {
    await testDatabaseConnection();

    buildApp().listen(port, () => {
      console.log(`[${SERVICE_NAME}] listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[request-service] Failed to start:', error);
    process.exit(1);
  }
}

startServer();