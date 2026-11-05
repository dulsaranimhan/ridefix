import { createServiceApp, HttpError } from '@ridefix/service-kit';
import type { Request, Response } from 'express';
import { pool } from './db';
import { REQUEST_STATUSES, canTransitionRequestStatus } from './status-transitions';

export const SERVICE_NAME = 'request-service';

const SERVICE_TYPES = [
  'Roadside Assistance',
  'Book a Garage',
  'Towing Service',
  'Battery Service',
] as const;

type ServiceType = (typeof SERVICE_TYPES)[number];

interface CreateRequestBody {
  driverId?: unknown;
  vehicleId?: unknown;
  vehicleDescription?: unknown;
  serviceType?: unknown;
  problemDescription?: unknown;
  locationLatitude?: unknown;
  locationLongitude?: unknown;
  locationAddress?: unknown;
}

interface ProviderRequestBody {
  providerId?: unknown;
  status?: unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROVIDER_STATUS_PREDECESSOR = {
  'On the way': 'Booked',
  'In progress': 'On the way',
  Completed: 'In progress',
} as const;

type ProviderProgressStatus = keyof typeof PROVIDER_STATUS_PREDECESSOR;

const REQUEST_COLUMNS = `
  id,
  driver_id AS "driverId",
  provider_id AS "providerId",
  vehicle_id AS "vehicleId",
  vehicle_description AS "vehicleDescription",
  service_type AS "serviceType",
  problem_description AS "problemDescription",
  location_latitude AS "locationLatitude",
  location_longitude AS "locationLongitude",
  location_address AS "locationAddress",
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"`;

export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME }, (app) => {
    app.post('/requests', async (req: Request, res: Response) => {
      const body = req.body as CreateRequestBody;

      const {
        driverId,
        vehicleId,
        vehicleDescription,
        serviceType,
        problemDescription,
        locationLatitude,
        locationLongitude,
        locationAddress,
      } = body ?? {};

      if (typeof driverId !== 'string' || !UUID_PATTERN.test(driverId)) {
        throw new HttpError(400, 'invalid_driver_id', 'A valid driverId UUID is required');
      }

      if (
        vehicleId !== undefined &&
        vehicleId !== null &&
        (typeof vehicleId !== 'string' || !UUID_PATTERN.test(vehicleId))
      ) {
        throw new HttpError(400, 'invalid_vehicle_id', 'vehicleId must be a valid UUID');
      }

      if (typeof serviceType !== 'string' || !SERVICE_TYPES.includes(serviceType as ServiceType)) {
        throw new HttpError(400, 'invalid_service_type', 'A supported serviceType is required');
      }

      if (
        typeof problemDescription !== 'string' ||
        problemDescription.trim().length === 0 ||
        problemDescription.length > 5000
      ) {
        throw new HttpError(
          400,
          'invalid_problem_description',
          'problemDescription must contain 1–5000 characters',
        );
      }

      if (
        typeof locationLatitude !== 'number' ||
        !Number.isFinite(locationLatitude) ||
        locationLatitude < -90 ||
        locationLatitude > 90
      ) {
        throw new HttpError(
          400,
          'invalid_location_latitude',
          'locationLatitude must be between -90 and 90',
        );
      }

      if (
        typeof locationLongitude !== 'number' ||
        !Number.isFinite(locationLongitude) ||
        locationLongitude < -180 ||
        locationLongitude > 180
      ) {
        throw new HttpError(
          400,
          'invalid_location_longitude',
          'locationLongitude must be between -180 and 180',
        );
      }

      if (
        locationAddress !== undefined &&
        locationAddress !== null &&
        (typeof locationAddress !== 'string' || locationAddress.length > 500)
      ) {
        throw new HttpError(
          400,
          'invalid_location_address',
          'locationAddress must be a string of at most 500 characters',
        );
      }

      if (
        vehicleDescription !== undefined &&
        vehicleDescription !== null &&
        (typeof vehicleDescription !== 'string' || vehicleDescription.trim().length > 200)
      ) {
        throw new HttpError(
          400,
          'invalid_vehicle_description',
          'vehicleDescription must be a string of at most 200 characters',
        );
      }

      const result = await pool.query(
        `INSERT INTO requests (
          driver_id,
          vehicle_id,
          vehicle_description,
          service_type,
          problem_description,
          location_latitude,
          location_longitude,
          location_address,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Open for bids')
        RETURNING
          id,
          driver_id AS "driverId",
          provider_id AS "providerId",
          vehicle_id AS "vehicleId",
          vehicle_description AS "vehicleDescription",
          service_type AS "serviceType",
          problem_description AS "problemDescription",
          location_latitude AS "locationLatitude",
          location_longitude AS "locationLongitude",
          location_address AS "locationAddress",
          status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"`,
        [
          driverId,
          vehicleId ?? null,
          typeof vehicleDescription === 'string' ? vehicleDescription.trim() || null : null,
          serviceType,
          problemDescription.trim(),
          locationLatitude,
          locationLongitude,
          locationAddress?.trim() || null,
        ],
      );

      res.status(201).json({ request: result.rows[0] });
    });

    app.get('/requests/open', async (_req: Request, res: Response) => {
      const result = await pool.query(
        `SELECT ${REQUEST_COLUMNS}
         FROM requests
         WHERE status = 'Open for bids' AND provider_id IS NULL
         ORDER BY created_at ASC`,
      );
      res.status(200).json({ requests: result.rows });
    });

    app.get('/requests/assigned', async (req: Request, res: Response) => {
      const providerId = req.query.providerId;
      if (typeof providerId !== 'string' || !UUID_PATTERN.test(providerId)) {
        throw new HttpError(
          400,
          'invalid_provider_id',
          'A valid providerId query parameter is required',
        );
      }

      const result = await pool.query(
        `SELECT ${REQUEST_COLUMNS}
         FROM requests
         WHERE provider_id = $1 AND status = ANY($2::varchar[])
         ORDER BY updated_at DESC`,
        [providerId, ['Booked', 'On the way', 'In progress', 'Completed']],
      );
      res.status(200).json({ requests: result.rows });
    });

    app.get('/requests/:id', async (req: Request, res: Response) => {
      const { id } = req.params;

      if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
        throw new HttpError(400, 'invalid_request_id', 'A valid request ID UUID is required');
      }

      const result = await pool.query(`SELECT ${REQUEST_COLUMNS} FROM requests WHERE id = $1`, [
        id,
      ]);

      if (result.rows.length === 0) {
        throw new HttpError(404, 'request_not_found', 'Request not found');
      }

      res.status(200).json({ request: result.rows[0] });
    });

    app.get('/requests', async (req: Request, res: Response) => {
      const driverId = req.query.driverId;

      if (typeof driverId !== 'string' || !UUID_PATTERN.test(driverId)) {
        throw new HttpError(
          400,
          'invalid_driver_id',
          'A valid driverId query parameter is required',
        );
      }

      const result = await pool.query(
        `SELECT ${REQUEST_COLUMNS}
         FROM requests
         WHERE driver_id = $1
         ORDER BY created_at DESC`,
        [driverId],
      );

      res.status(200).json({ requests: result.rows });
    });

    app.post('/requests/:id/accept', async (req: Request, res: Response) => {
      const { id } = req.params;
      const { providerId } = (req.body ?? {}) as ProviderRequestBody;
      if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
        throw new HttpError(400, 'invalid_request_id', 'A valid request ID UUID is required');
      }
      if (typeof providerId !== 'string' || !UUID_PATTERN.test(providerId)) {
        throw new HttpError(400, 'invalid_provider_id', 'A valid providerId UUID is required');
      }

      const result = await pool.query(
        `UPDATE requests
         SET provider_id = $2, status = 'Booked', updated_at = NOW()
         WHERE id = $1 AND status = 'Open for bids' AND provider_id IS NULL
         RETURNING ${REQUEST_COLUMNS}`,
        [id, providerId],
      );
      if (result.rows.length === 0) {
        const existing = await pool.query('SELECT id FROM requests WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          throw new HttpError(404, 'request_not_found', 'Request not found');
        }
        throw new HttpError(409, 'request_already_taken', 'This request has already been accepted');
      }
      res.status(200).json({ request: result.rows[0] });
    });

    app.patch('/requests/:id/status', async (req: Request, res: Response) => {
      const { id } = req.params;
      const { providerId, status } = (req.body ?? {}) as ProviderRequestBody;
      if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
        throw new HttpError(400, 'invalid_request_id', 'A valid request ID UUID is required');
      }
      if (typeof providerId !== 'string' || !UUID_PATTERN.test(providerId)) {
        throw new HttpError(400, 'invalid_provider_id', 'A valid providerId UUID is required');
      }
      if (typeof status !== 'string' || !Object.hasOwn(PROVIDER_STATUS_PREDECESSOR, status)) {
        throw new HttpError(
          400,
          'invalid_request_status',
          'A supported provider status is required',
        );
      }

      const nextStatus = status as ProviderProgressStatus;
      const previousStatus = PROVIDER_STATUS_PREDECESSOR[nextStatus];
      if (!canTransitionRequestStatus(previousStatus, nextStatus)) {
        throw new HttpError(400, 'invalid_request_status', 'This status transition is not allowed');
      }

      const result = await pool.query(
        `UPDATE requests
         SET status = $3, updated_at = NOW()
         WHERE id = $1 AND provider_id = $2 AND status = $4
         RETURNING ${REQUEST_COLUMNS}`,
        [id, providerId, nextStatus, previousStatus],
      );
      if (result.rows.length === 0) {
        const existing = await pool.query(
          'SELECT provider_id AS "providerId", status FROM requests WHERE id = $1',
          [id],
        );
        if (existing.rows.length === 0 || existing.rows[0].providerId !== providerId) {
          throw new HttpError(404, 'request_not_found', 'Request not found for this provider');
        }
        throw new HttpError(
          409,
          'invalid_request_transition',
          `Cannot move a request from "${existing.rows[0].status}" to "${nextStatus}"`,
        );
      }
      res.status(200).json({ request: result.rows[0] });
    });

    app.post('/requests/:id/cancel', async (req: Request, res: Response) => {
      const { id } = req.params;

      if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
        throw new HttpError(400, 'invalid_request_id', 'A valid request ID UUID is required');
      }

      const result = await pool.query(
        `UPDATE requests
         SET status = 'Cancelled',
             updated_at = NOW()
         WHERE id = $1
           AND status = ANY($2::varchar[])
         RETURNING
           id,
           driver_id AS "driverId",
          provider_id AS "providerId",
           vehicle_id AS "vehicleId",
          vehicle_description AS "vehicleDescription",
           service_type AS "serviceType",
           problem_description AS "problemDescription",
           location_latitude AS "locationLatitude",
           location_longitude AS "locationLongitude",
           location_address AS "locationAddress",
           status,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, REQUEST_STATUSES.filter((status) => canTransitionRequestStatus(status, 'Cancelled'))],
      );

      if (result.rows.length === 0) {
        const existing = await pool.query('SELECT status FROM requests WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          throw new HttpError(404, 'request_not_found', 'Request not found');
        }
        const currentStatus = existing.rows[0].status;
        throw new HttpError(
          409,
          'request_cannot_be_cancelled',
          `A request with status "${currentStatus}" cannot be cancelled`,
        );
      }

      res.status(200).json({ request: result.rows[0] });
    });
  });
}
