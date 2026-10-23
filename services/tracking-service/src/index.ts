import { createServer } from 'node:http';
import { readPort } from '@ridefix/service-kit';
import { buildApp, SERVICE_NAME } from './app';
import { attachSocketServer } from './socket';

const port = readPort('TRACKING_SERVICE_PORT', 4004);

const httpServer = createServer(buildApp());
attachSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`[${SERVICE_NAME}] HTTP + Socket.IO listening on http://localhost:${port}`);
});
