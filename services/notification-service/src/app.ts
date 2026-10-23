import { createServiceApp } from '@ridefix/service-kit';

export const SERVICE_NAME = 'notification-service';

// Owns notification rules and FCM device tokens.
// Routes are added in milestone 6 (vertical slice).
export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME });
}
