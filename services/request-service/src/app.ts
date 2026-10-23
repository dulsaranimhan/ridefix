import { createServiceApp } from '@ridefix/service-kit';

export const SERVICE_NAME = 'request-service';

// Owns help requests and their valid status changes.
// Routes are added in milestone 6 (vertical slice).
export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME });
}
