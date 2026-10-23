import { createServiceApp } from '@ridefix/service-kit';

export const SERVICE_NAME = 'matching-service';

// Finds nearby eligible providers with PostGIS, then road distance and ETA from Google Maps.
// Routes are added in milestone 6 (vertical slice).
export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME });
}
