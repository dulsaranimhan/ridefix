import { createServiceApp, HttpError } from '@ridefix/service-kit';

export const SERVICE_NAME = 'matching-service';

type OsrmRoute = {
  code?: string;
  routes?: Array<{ distance: number; duration: number; geometry: unknown }>;
};

function coordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME }, (app) => {
    app.get('/matching/route', async (req, res, next) => {
      const { fromLng, fromLat, toLng, toLat } = req.query;
      const points = [fromLng, fromLat, toLng, toLat].map((value) =>
        typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN,
      );
      const [originLng, originLat, destinationLng, destinationLat] = points as [
        number,
        number,
        number,
        number,
      ];
      if (
        !points.every(coordinate) ||
        Math.abs(originLng) > 180 ||
        Math.abs(destinationLng) > 180 ||
        Math.abs(originLat) > 90 ||
        Math.abs(destinationLat) > 90
      ) {
        next(
          new HttpError(
            400,
            'invalid_coordinates',
            'Provide valid fromLng, fromLat, toLng and toLat values',
          ),
        );
        return;
      }

      // The public OSRM demo is for local development only; configure a suitable endpoint elsewhere.
      const baseUrl = (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(
        /\/$/,
        '',
      );
      const path = `/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`;
      try {
        const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error(`OSRM returned HTTP ${response.status}`);
        const result = (await response.json()) as OsrmRoute;
        const route = result.routes?.[0];
        if (result.code !== 'Ok' || !route) {
          next(
            new HttpError(
              404,
              'route_not_found',
              'No driving route was found for these coordinates',
            ),
          );
          return;
        }
        res.json({
          provider: 'osrm',
          distanceMeters: route.distance,
          durationSeconds: route.duration,
          geometry: route.geometry,
        });
      } catch (error) {
        if (error instanceof HttpError) {
          next(error);
          return;
        }
        next(
          new HttpError(
            502,
            'routing_unavailable',
            'The routing service is temporarily unavailable',
          ),
        );
      }
    });
  });
}
