import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

export async function submitBid(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { requestId, providerId, price, estimatedTimeMinutes } = req.body;

    // Validate required fields
    if (!requestId || !providerId || price === undefined || estimatedTimeMinutes === undefined) {
      res.status(400).json({
        message: 'All fields are required',
      });
      return;
    }

    // Validate UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(requestId) || !uuidRegex.test(providerId)) {
      res.status(400).json({
        message: 'Invalid requestId or providerId',
      });
      return;
    }

    // Validate price and estimated time
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      res.status(400).json({
        message: 'Price must be a positive number',
      });
      return;
    }

    if (!Number.isInteger(estimatedTimeMinutes) || estimatedTimeMinutes <= 0) {
      res.status(400).json({
        message: 'Estimated time must be a positive integer',
      });
      return;
    }

    // Insert bid into database
    const result = await pool.query(
      `INSERT INTO bids (request_id, provider_id, price, estimated_time_minutes)
       VALUES ($1, $2, $3, $4)
       RETURNING id,
                 request_id AS "requestId",
                 provider_id AS "providerId",
                 price,
                 estimated_time_minutes AS "estimatedTimeMinutes",
                 status,
                 created_at AS "createdAt"`,
      [requestId, providerId, price, estimatedTimeMinutes]
    );

    res.status(201).json({
      message: 'Bid submitted successfully',
      bid: result.rows[0],
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      res.status(409).json({
        message: 'You have already submitted a bid for this request',
      });
      return;
    }

    next(error);
  }
}