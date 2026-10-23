import { readPort } from '@ridefix/service-kit';
import { buildApp, SERVICE_NAME } from './app';

const port = readPort('PAYMENT_SERVICE_PORT', 4005);

buildApp().listen(port, () => {
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${port}`);
});
