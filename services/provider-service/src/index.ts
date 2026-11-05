
import { createApp } from './app';
import { pool, testDatabaseConnection } from './db';

const PORT = Number(
  process.env.PORT ?? process.env.PROVIDER_SERVICE_PORT ?? 4007,
);

async function startServer() {
  try {
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
      throw new Error(`Invalid server port: ${PORT}`);
    }

    await testDatabaseConnection();

    const app = createApp(pool);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[provider-service] Running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[provider-service] Failed to start:', error);
    process.exit(1);
  }
}

startServer();
