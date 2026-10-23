import { createServiceApp } from '@ridefix/service-kit';

export const SERVICE_NAME = 'bidding-service';

// Owns bid submission, validation, acceptance, rejection and expiry.
// Routes are added in milestone 6 (vertical slice).
export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME });
}
