import express, { Request, Response } from 'express';
import { Pool } from 'pg';

export function createApp(db: Pool) {
  const app = express();

  app.use(express.json());

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      service: 'provider-service',
      status: 'healthy',
    });
  });

  // Update provider availability
  app.put(
    '/providers/:providerId/availability',
    async (req: Request, res: Response) => {
     const providerId = req.params.providerId;

if (typeof providerId !== 'string') {
  return res.status(400).json({
    message: 'Invalid provider ID',
  });
}
      const { isAvailable } = req.body;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(providerId)) {
        return res.status(400).json({
          message: 'Invalid provider ID',
        });
      }

      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({
          message: 'isAvailable must be a boolean',
        });
      }

      try {
        const result = await db.query(
          `INSERT INTO provider_availability
            (provider_id, is_available)
           VALUES ($1, $2)
           ON CONFLICT (provider_id)
           DO UPDATE SET
             is_available = EXCLUDED.is_available,
             updated_at = NOW()
           RETURNING provider_id, is_available, updated_at`,
          [providerId, isAvailable],
        );

        return res.status(200).json({
          message: 'Provider availability updated successfully',
          provider: result.rows[0],
        });
      } catch (error) {
        console.error('[provider-service] Availability update failed:', error);

        return res.status(500).json({
          message: 'Failed to update provider availability',
        });
      }
    },
  );

  // Get provider availability
  app.get(
    '/providers/:providerId/availability',
    async (req: Request, res: Response) => {
      const providerId = req.params.providerId;

if (typeof providerId !== 'string') {
  return res.status(400).json({
    message: 'Invalid provider ID',
  });
}

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(providerId)) {
        return res.status(400).json({
          message: 'Invalid provider ID',
        });
      }

      try {
        const result = await db.query(
          `SELECT provider_id, is_available, updated_at
           FROM provider_availability
           WHERE provider_id = $1`,
          [providerId],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            message: 'Provider availability not found',
          });
        }

        return res.status(200).json({
          provider: result.rows[0],
        });
      } catch (error) {
        console.error('[provider-service] Availability lookup failed:', error);

        return res.status(500).json({
          message: 'Failed to get provider availability',
        });
      }
    },
  );

  return app;
}