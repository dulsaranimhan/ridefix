import { createServiceApp } from '@ridefix/service-kit';
import { Router, Request, Response } from 'express';

export const SERVICE_NAME = 'matching-service';

const router = Router();

const REQUEST_SERVICE_URL =
  process.env.REQUEST_SERVICE_URL ?? 'http://localhost:4001';

// Get available requests for providers
router.get('/requests', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${REQUEST_SERVICE_URL.replace(/\/$/, '')}/requests`,
    );

    if (!response.ok) {
      res.status(502).json({
        message: 'Failed to retrieve requests from Request Service',
      });
      return;
    }

    const data = (await response.json()) as {
      requests?: Array<{
        id: string;
        driverId: string;
        serviceType: string;
        description: string;
        latitude: number;
        longitude: number;
        status: string;
        createdAt: string;
      }>;
    };

    const availableRequests = (data.requests ?? []).filter(
      (item) => item.status === 'Open',
    );

    res.status(200).json({
      message: 'Available requests retrieved successfully',
      total: availableRequests.length,
      requests: availableRequests,
    });
  } catch (error) {
    console.error('[matching-service] Get requests error:', error);

    res.status(500).json({
      message: 'Matching Service could not retrieve requests',
    });
  }
});

export function buildApp() {
  return createServiceApp(
    { name: SERVICE_NAME },
    (app) => {
      app.use('/matching', router);
    },
  );
}