import { createServiceApp, HttpError } from '@ridefix/service-kit';
import { pool } from './db';

export const SERVICE_NAME = 'matching-service';

type OsrmRoute = {
  code?: string;
  routes?: Array<{ distance: number; duration: number; geometry: unknown }>;
};

function coordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const AVAILABILITY_COLUMNS = `
  provider_id AS "providerId",
  is_available AS "isAvailable",
  updated_at AS "updatedAt"`;

function requireProviderId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new HttpError(400, 'invalid_provider_id', 'A valid provider ID UUID is required');
  }
  return value;
}

export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME }, (app) => {
    // Provider IDs are unverified request data until JWT verification exists.
    app.get('/matching/providers/:providerId/availability', async (req, res) => {
      const providerId = requireProviderId(req.params.providerId);
      const result = await pool.query(
        `SELECT ${AVAILABILITY_COLUMNS} FROM provider_availability WHERE provider_id = $1`,
        [providerId],
      );
      // A provider who has never set this is offline.
      res.json({
        availability: result.rows[0] ?? { providerId, isAvailable: false, updatedAt: null },
      });
    });

    app.put('/matching/providers/:providerId/availability', async (req, res) => {
      const providerId = requireProviderId(req.params.providerId);
      const isAvailable = (req.body as { isAvailable?: unknown } | undefined)?.isAvailable;
      if (typeof isAvailable !== 'boolean') {
        throw new HttpError(400, 'invalid_availability', 'isAvailable must be true or false');
      }
      const result = await pool.query(
        `INSERT INTO provider_availability (provider_id, is_available)
         VALUES ($1, $2)
         ON CONFLICT (provider_id)
         DO UPDATE SET is_available = EXCLUDED.is_available, updated_at = NOW()
         RETURNING ${AVAILABILITY_COLUMNS}`,
        [providerId, isAvailable],
      );
      res.json({ availability: result.rows[0] });
    });

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
