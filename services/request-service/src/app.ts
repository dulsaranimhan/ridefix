
import { createServiceApp, HttpError } from '@ridefix/service-kit';
import type { Request, Response } from 'express';
import { pool } from './db';

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
  serviceType?: unknown;
  problemDescription?: unknown;
  locationLatitude?: unknown;
  locationLongitude?: unknown;
  locationAddress?: unknown;
}

export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME }, (app) => {
    app.post('/requests', async (req: Request, res: Response) => {
      const body = req.body as CreateRequestBody;

      const {
        driverId,
        vehicleId,
        serviceType,
        problemDescription,
        locationLatitude,
        locationLongitude,
        locationAddress,
      } = body ?? {};

      if (
        typeof driverId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          driverId,
        )
      ) {
        throw new HttpError(400, 'invalid_driver_id', 'A valid driverId UUID is required');
      }

      if (
        vehicleId !== undefined &&
        vehicleId !== null &&
        (typeof vehicleId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            vehicleId,
          ))
      ) {
        throw new HttpError(400, 'invalid_vehicle_id', 'vehicleId must be a valid UUID');
      }

      if (
        typeof serviceType !== 'string' ||
        !SERVICE_TYPES.includes(serviceType as ServiceType)
      ) {
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

      const result = await pool.query(
        `INSERT INTO requests (
          driver_id,
          vehicle_id,
          service_type,
          problem_description,
          location_latitude,
          location_longitude,
          location_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          driver_id AS "driverId",
          vehicle_id AS "vehicleId",
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
          serviceType,
          problemDescription.trim(),
          locationLatitude,
          locationLongitude,
          locationAddress?.trim() || null,
        ],
      );

      res.status(201).json({ request: result.rows[0] });
    });

    app.get('/requests/:id', async (req: Request, res: Response) => {
      const { id } = req.params;

      if (
      typeof id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ) {
      throw new HttpError(400, 'invalid_request_id', 'A valid request ID UUID is required');
    }

  const result = await pool.query(
    `SELECT
       id,
       driver_id AS "driverId",
       vehicle_id AS "vehicleId",
       service_type AS "serviceType",
       problem_description AS "problemDescription",
       location_latitude AS "locationLatitude",
       location_longitude AS "locationLongitude",
       location_address AS "locationAddress",
       status,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM requests
     WHERE id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'request_not_found', 'Request not found');
  }

  res.status(200).json({ request: result.rows[0] });
});


app.get('/requests', async (req: Request, res: Response) => {
  const driverId = req.query.driverId;

  if (
    typeof driverId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      driverId,
    )
  ) {
    throw new HttpError(400, 'invalid_driver_id', 'A valid driverId query parameter is required');
  }

  const result = await pool.query(
    `SELECT
       id,
       driver_id AS "driverId",
       vehicle_id AS "vehicleId",
       service_type AS "serviceType",
       problem_description AS "problemDescription",
       location_latitude AS "locationLatitude",
       location_longitude AS "locationLongitude",
       location_address AS "locationAddress",
       status,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM requests
     WHERE driver_id = $1
     ORDER BY created_at DESC`,
    [driverId],
  );

  res.status(200).json({ requests: result.rows });
});


app.post('/requests/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new HttpError(400, 'invalid_request_id', 'A valid request ID UUID is required');
  }

  const result = await pool.query(
    `UPDATE requests
     SET status = 'Cancelled',
         updated_at = NOW()
     WHERE id = $1
       AND status IN ('Created', 'Matching', 'Open for bids')
     RETURNING
       id,
       driver_id AS "driverId",
       vehicle_id AS "vehicleId",
       service_type AS "serviceType",
       problem_description AS "problemDescription",
       location_latitude AS "locationLatitude",
       location_longitude AS "locationLongitude",
       location_address AS "locationAddress",
       status,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [id],
  );

  if (result.rows.length === 0) {
    const existing = await pool.query(
      'SELECT status FROM requests WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      throw new HttpError(404, 'request_not_found', 'Request not found');
    }

    throw new HttpError(
      409,
      'request_cannot_be_cancelled',
      `A request with status "${existing.rows[0].status}" cannot be cancelled`,
    );
  }

  res.status(200).json({ request: result.rows[0] });
});

  });
}
