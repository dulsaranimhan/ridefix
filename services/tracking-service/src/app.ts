import { createServiceApp } from '@ridefix/service-kit';

export const SERVICE_NAME = 'tracking-service';

// Shares live provider location over Socket.IO with the driver and provider of an active booking.
// Routes are added in milestone 6 (vertical slice).
export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME });
}
