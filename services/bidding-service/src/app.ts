import { createServiceApp, HttpError } from '@ridefix/service-kit';
import type { Request, Response } from 'express';
import { pool } from './db';
import { bookRequest, getRequest, type RequestSummary } from './request-client';

export const SERVICE_NAME = 'bidding-service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BID_STATUSES = ['Submitted', 'Accepted', 'Rejected', 'Expired', 'Withdrawn'];
const OPEN_REQUEST_STATUS = 'Open for bids';
const MAX_PRICE_LKR = 10_000_000;
const MAX_ETA_MINUTES = 1_440;
const MAX_DISTANCE_KM = 1_000;
const LIST_LIMIT = 200;
const UNIQUE_VIOLATION = '23505';

const BID_COLUMNS = `
  id,
  request_id AS "requestId",
  provider_id AS "providerId",
  provider_name AS "providerName",
  price_lkr AS "priceLkr",
  eta_minutes AS "etaMinutes",
  distance_km AS "distanceKm",
  note,
  status,
  expires_at AS "expiresAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"`;

function bidExpiryMinutes() {
  const value = Number(process.env.BID_EXPIRY_MINUTES);
  return Number.isInteger(value) && value > 0 ? value : 15;
}

function requireUuid(value: unknown, code: string, label: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new HttpError(400, code, `A valid ${label} UUID is required`);
  }
  return value;
}

function requireIntegerInRange(value: unknown, max: number, code: string, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > max) {
    throw new HttpError(400, code, `${label} must be a whole number from 1 to ${max}`);
  }
  return value;
}

/** Bids expire by time. Reads and writes close overdue bids first, so no background job is needed. */
async function closeExpiredBids() {
  await pool.query(
    `UPDATE bids SET status = 'Expired', updated_at = NOW()
     WHERE status = 'Submitted' AND expires_at <= NOW()`,
  );
}

async function requireRequest(id: string): Promise<RequestSummary> {
  const found = await getRequest(id);
  if (!found) throw new HttpError(404, 'request_not_found', 'Request not found');
  return found;
}

/** Driver ID is unverified request data until JWT verification exists. See the OpenAPI contract. */
async function requireDriversOpenRequest(requestId: string, driverId: string) {
  const found = await requireRequest(requestId);
  if (found.driverId !== driverId) {
    throw new HttpError(403, 'not_request_owner', 'This request belongs to another driver');
  }
  if (found.status !== OPEN_REQUEST_STATUS) {
    throw new HttpError(409, 'request_not_open', 'This request is no longer open for bids');
  }
}

export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME }, (app) => {
    app.post('/bids', async (req: Request, res: Response) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const requestId = requireUuid(body.requestId, 'invalid_request_id', 'requestId');
      const providerId = requireUuid(body.providerId, 'invalid_provider_id', 'providerId');
      const priceLkr = requireIntegerInRange(
        body.priceLkr,
        MAX_PRICE_LKR,
        'invalid_price',
        'priceLkr',
      );
      const etaMinutes = requireIntegerInRange(
        body.etaMinutes,
        MAX_ETA_MINUTES,
        'invalid_eta',
        'etaMinutes',
      );

      const { providerName, distanceKm, note } = body;
      if (
        typeof providerName !== 'string' ||
        providerName.trim().length === 0 ||
        providerName.trim().length > 120
      ) {
        throw new HttpError(400, 'invalid_provider_name', 'providerName must be 1-120 characters');
      }
      if (
        distanceKm !== undefined &&
        distanceKm !== null &&
        (typeof distanceKm !== 'number' ||
          !Number.isFinite(distanceKm) ||
          distanceKm < 0 ||
          distanceKm > MAX_DISTANCE_KM)
      ) {
        throw new HttpError(
          400,
          'invalid_distance',
          `distanceKm must be between 0 and ${MAX_DISTANCE_KM}`,
        );
      }
      if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 500)) {
        throw new HttpError(400, 'invalid_note', 'note must be at most 500 characters');
      }

      const target = await requireRequest(requestId);
      if (target.status !== OPEN_REQUEST_STATUS) {
        throw new HttpError(409, 'request_not_open', 'This request is no longer open for bids');
      }

      await closeExpiredBids();
      try {
        const result = await pool.query(
          `INSERT INTO bids (
            request_id, provider_id, provider_name, price_lkr, eta_minutes, distance_km, note,
            expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + make_interval(mins => $8::int))
          RETURNING ${BID_COLUMNS}`,
          [
            requestId,
            providerId,
            providerName.trim(),
            priceLkr,
            etaMinutes,
            distanceKm ?? null,
            typeof note === 'string' ? note.trim() || null : null,
            bidExpiryMinutes(),
          ],
        );
        res.status(201).json({ bid: result.rows[0] });
      } catch (error) {
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
          throw new HttpError(
            409,
            'bid_already_submitted',
            'This provider already has an open bid on this request',
          );
        }
        throw error;
      }
    });

    app.get('/bids', async (req: Request, res: Response) => {
      const { requestId, providerId, status } = req.query;
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (requestId !== undefined) {
        values.push(requireUuid(requestId, 'invalid_request_id', 'requestId'));
        conditions.push(`request_id = $${values.length}`);
      }
      if (providerId !== undefined) {
        values.push(requireUuid(providerId, 'invalid_provider_id', 'providerId'));
        conditions.push(`provider_id = $${values.length}`);
      }
      if (status !== undefined) {
        if (typeof status !== 'string' || !BID_STATUSES.includes(status)) {
          throw new HttpError(400, 'invalid_bid_status', 'A supported bid status is required');
        }
        values.push(status);
        conditions.push(`status = $${values.length}`);
      }
      if (conditions.length === 0) {
        throw new HttpError(
          400,
          'missing_bid_filter',
          'Provide at least one of requestId, providerId or status',
        );
      }

      await closeExpiredBids();
      const result = await pool.query(
        `SELECT ${BID_COLUMNS} FROM bids
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT ${LIST_LIMIT}`,
        values,
      );
      res.status(200).json({ bids: result.rows });
    });

    app.get('/bids/:id', async (req: Request, res: Response) => {
      const id = requireUuid(req.params.id, 'invalid_bid_id', 'bid ID');
      await closeExpiredBids();
      const result = await pool.query(`SELECT ${BID_COLUMNS} FROM bids WHERE id = $1`, [id]);
      if (result.rows.length === 0) throw new HttpError(404, 'bid_not_found', 'Bid not found');
      res.status(200).json({ bid: result.rows[0] });
    });

    // Payment is a placeholder for now, so accepting a bid books the request straight away.
    app.post('/bids/:id/accept', async (req: Request, res: Response) => {
      const id = requireUuid(req.params.id, 'invalid_bid_id', 'bid ID');
      const driverId = requireUuid(req.body?.driverId, 'invalid_driver_id', 'driverId');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Locks every bid on the request, so two accepts cannot both win.
        const locked = await client.query(
          `SELECT id, request_id AS "requestId", provider_id AS "providerId", status,
                  expires_at <= NOW() AS "isExpired"
           FROM bids
           WHERE request_id = (SELECT request_id FROM bids WHERE id = $1)
           ORDER BY id
           FOR UPDATE`,
          [id],
        );
        const bid = locked.rows.find((row: { id: string }) => row.id === id);
        if (!bid) throw new HttpError(404, 'bid_not_found', 'Bid not found');
        if (bid.status !== 'Submitted') {
          throw new HttpError(409, 'bid_not_open', `This bid is already ${bid.status}`);
        }
        if (bid.isExpired) throw new HttpError(409, 'bid_expired', 'This bid has expired');

        await requireDriversOpenRequest(bid.requestId, driverId);
        if (!(await bookRequest(bid.requestId, bid.providerId))) {
          throw new HttpError(409, 'request_not_open', 'This request is no longer open for bids');
        }

        const accepted = await client.query(
          `UPDATE bids SET status = 'Accepted', updated_at = NOW()
           WHERE id = $1
           RETURNING ${BID_COLUMNS}`,
          [id],
        );
        await client.query(
          `UPDATE bids SET status = 'Rejected', updated_at = NOW()
           WHERE request_id = $1 AND id <> $2 AND status = 'Submitted'`,
          [bid.requestId, id],
        );
        await client.query('COMMIT');
        res.status(200).json({ bid: accepted.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    app.post('/bids/:id/reject', async (req: Request, res: Response) => {
      const id = requireUuid(req.params.id, 'invalid_bid_id', 'bid ID');
      const driverId = requireUuid(req.body?.driverId, 'invalid_driver_id', 'driverId');

      const existing = await pool.query(
        'SELECT request_id AS "requestId" FROM bids WHERE id = $1',
        [id],
      );
      if (existing.rows.length === 0) throw new HttpError(404, 'bid_not_found', 'Bid not found');
      await requireDriversOpenRequest(existing.rows[0].requestId, driverId);

      const result = await pool.query(
        `UPDATE bids SET status = 'Rejected', updated_at = NOW()
         WHERE id = $1 AND status = 'Submitted' AND expires_at > NOW()
         RETURNING ${BID_COLUMNS}`,
        [id],
      );
      if (result.rows.length === 0) {
        throw new HttpError(409, 'bid_not_open', 'This bid is no longer open');
      }
      res.status(200).json({ bid: result.rows[0] });
    });

    app.post('/bids/:id/withdraw', async (req: Request, res: Response) => {
      const id = requireUuid(req.params.id, 'invalid_bid_id', 'bid ID');
      const providerId = requireUuid(req.body?.providerId, 'invalid_provider_id', 'providerId');

      const result = await pool.query(
        `UPDATE bids SET status = 'Withdrawn', updated_at = NOW()
         WHERE id = $1 AND provider_id = $2 AND status = 'Submitted'
         RETURNING ${BID_COLUMNS}`,
        [id, providerId],
      );
      if (result.rows.length === 0) {
        const existing = await pool.query(
          'SELECT provider_id AS "providerId" FROM bids WHERE id = $1',
          [id],
        );
        if (existing.rows.length === 0 || existing.rows[0].providerId !== providerId) {
          throw new HttpError(404, 'bid_not_found', 'Bid not found for this provider');
        }
        throw new HttpError(409, 'bid_not_open', 'This bid is no longer open');
      }
      res.status(200).json({ bid: result.rows[0] });
    });
  });
}
