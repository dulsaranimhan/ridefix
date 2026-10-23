import { createServiceApp } from '@ridefix/service-kit';

export const SERVICE_NAME = 'payment-service';

// Starts PayHere payments and marks them paid only after verifying the signed server notification.
// Routes are added in milestone 6 (vertical slice).
export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME });
}
