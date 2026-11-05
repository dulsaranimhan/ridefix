
import { createServiceApp } from '@ridefix/service-kit';
import { Router, Request, Response } from 'express';

export const SERVICE_NAME = 'matching-service';

const router = Router();

const REQUEST_SERVICE_URL =
  process.env.REQUEST_SERVICE_URL ?? 'http://localhost:4001';

const PROVIDER_SERVICE_URL =
  process.env.PROVIDER_SERVICE_URL ?? 'http://localhost:4007';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Get available requests for an available provider
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const providerId = req.query.providerId;

    if (typeof providerId !== 'string' || !uuidRegex.test(providerId)) {
      res.status(400).json({
        message: 'A valid providerId is required',
      });
      return;
    }

    // Check provider availability
    const availabilityResponse = await fetch(
      `${PROVIDER_SERVICE_URL.replace(/\/+$/, '')}/providers/${providerId}/availability`,
    );

    if (availabilityResponse.status === 404) {
      res.status(403).json({
        message: 'Provider availability has not been configured',
        requests: [],
      });
      return;
    }

    if (!availabilityResponse.ok) {
      res.status(502).json({
        message: 'Could not check provider availability',
      });
      return;
    }

    const availabilityData = (await availabilityResponse.json()) as {
      provider?: {
        is_available?: boolean;
      };
    };

    if (availabilityData.provider?.is_available !== true) {
      res.status(200).json({
        message: 'Provider is currently offline',
        total: 0,
        requests: [],
      });
      return;
    }

    // Get requests from Request Service
    const response = await fetch(
      `${REQUEST_SERVICE_URL.replace(/\/+$/, '')}/requests`,
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
