import { createServiceApp } from '@ridefix/service-kit';
import { Router, Request, Response } from 'express';
import { pool } from './db';

export const SERVICE_NAME = 'request-service';

const router = Router();

// Create a new help request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { driverId, serviceType, description, location } = req.body;

    if (!driverId || !serviceType || !location) {
      res.status(400).json({
        message: 'driverId, serviceType and location are required',
      });
      return;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      res.status(400).json({
        message: 'Invalid location coordinates',
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO requests
        (driver_id, service_type, description, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         driver_id AS "driverId",
         service_type AS "serviceType",
         description,
         latitude,
         longitude,
         status,
         created_at AS "createdAt"`,
      [
        driverId,
        serviceType,
        description ?? '',
        latitude,
        longitude,
      ],
    );

    res.status(201).json({
      message: 'Help request created successfully',
      request: result.rows[0],
    });
  } catch (error) {
    console.error('[request-service] Create request error:', error);

    res.status(500).json({
      message: 'Failed to create help request',
    });
  }
});

// Get all requests
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         driver_id AS "driverId",
         service_type AS "serviceType",
         description,
         latitude,
         longitude,
         status,
         created_at AS "createdAt"
       FROM requests
       ORDER BY created_at DESC`,
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('[request-service] Get requests error:', error);

    res.status(500).json({
      message: 'Failed to retrieve requests',
    });
  }
});

// Get one request
router.get('/:requestId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         driver_id AS "driverId",
         service_type AS "serviceType",
         description,
         latitude,
         longitude,
         status,
         created_at AS "createdAt"
       FROM requests
       WHERE id = $1`,
      [req.params.requestId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Request not found',
      });
      return;
    }

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('[request-service] Get request error:', error);

    res.status(500).json({
      message: 'Failed to retrieve request',
    });
  }
});

export function buildApp() {
  return createServiceApp(
    { name: SERVICE_NAME },
    (app) => {
      app.use('/requests', router);
    },
  );
}