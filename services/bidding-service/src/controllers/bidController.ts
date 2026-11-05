
import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Safely read Express route parameters
function getRouteParam(
  value: string | string[] | undefined
): string | null {
  return typeof value === 'string' ? value : null;
}

// Submit a new bid
export async function submitBid(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { requestId, providerId, price, estimatedTimeMinutes } = req.body;

    if (
      !uuidRegex.test(String(requestId ?? '')) ||
      !uuidRegex.test(String(providerId ?? ''))
    ) {
      res.status(400).json({ message: 'Invalid requestId or providerId' });
      return;
    }

    if (
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      res.status(400).json({ message: 'Price must be a positive number' });
      return;
    }

    if (
      !Number.isInteger(estimatedTimeMinutes) ||
      estimatedTimeMinutes <= 0
    ) {
      res.status(400).json({
        message: 'Estimated time must be a positive number of minutes',
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO bids
       (request_id, provider_id, price, estimated_time_minutes)
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

// Get all bids for a request
export async function getBidsForRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestId = getRouteParam(req.params.requestId);

    if (!requestId || !uuidRegex.test(requestId)) {
      res.status(400).json({ message: 'Invalid requestId' });
      return;
    }

    const result = await pool.query(
      `SELECT id,
       request_id AS "requestId",
       provider_id AS "providerId",
       price,
       estimated_time_minutes AS "estimatedTimeMinutes",
       status,
       created_at AS "createdAt"
       FROM bids
       WHERE request_id = $1
       ORDER BY price ASC, created_at ASC`,
      [requestId]
    );

    res.json({ bids: result.rows });
  } catch (error) {
    next(error);
  }
}

// Get all bids submitted by a provider
export async function getBidsForProvider(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerId = getRouteParam(req.params.providerId);

    if (!providerId || !uuidRegex.test(providerId)) {
      res.status(400).json({ message: 'Invalid providerId' });
      return;
    }

    const result = await pool.query(
      `SELECT id,
       request_id AS "requestId",
       provider_id AS "providerId",
       price,
       estimated_time_minutes AS "estimatedTimeMinutes",
       status,
       created_at AS "createdAt"
       FROM bids
       WHERE provider_id = $1
       ORDER BY created_at DESC`,
      [providerId]
    );

    res.json({ bids: result.rows });
  } catch (error) {
    next(error);
  }
}

// Accept or reject a pending bid
export async function updateBidStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const bidId = getRouteParam(req.params.bidId);
  const { status } = req.body;

  if (!bidId || !uuidRegex.test(bidId)) {
    res.status(400).json({ message: 'Invalid bidId' });
    return;
  }

  if (status !== 'Accepted' && status !== 'Rejected') {
    res.status(400).json({
      message: 'Status must be Accepted or Rejected',
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      `SELECT id, request_id, status
       FROM bids
       WHERE id = $1
       FOR UPDATE`,
      [bidId]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Bid not found' });
      return;
    }

    const bid = found.rows[0];

    if (bid.status !== 'Pending') {
      await client.query('ROLLBACK');
      res.status(409).json({
        message: 'This bid is no longer pending',
      });
      return;
    }

    if (status === 'Accepted') {
      const accepted = await client.query(
        `SELECT id
         FROM bids
         WHERE request_id = $1
         AND status = 'Accepted'
         FOR UPDATE`,
        [bid.request_id]
      );

      if (accepted.rowCount) {
        await client.query('ROLLBACK');
        res.status(409).json({
          message: 'Another bid has already been accepted for this request',
        });
        return;
      }

      await client.query(
        `UPDATE bids
         SET status = 'Rejected', updated_at = NOW()
         WHERE request_id = $1
         AND id <> $2
         AND status = 'Pending'`,
        [bid.request_id, bidId]
      );
    }

    const updated = await client.query(
      `UPDATE bids
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id,
       request_id AS "requestId",
       provider_id AS "providerId",
       price,
       estimated_time_minutes AS "estimatedTimeMinutes",
       status,
       created_at AS "createdAt"`,
      [bidId, status]
    );

    await client.query('COMMIT');

    res.json({
      message: `Bid ${status.toLowerCase()} successfully`,
      bid: updated.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}
