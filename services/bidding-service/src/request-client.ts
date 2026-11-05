import { HttpError } from '@ridefix/service-kit';

// The Request Service owns requests, so this service reads and changes them only over HTTP.
const TIMEOUT_MS = 5_000;

export interface RequestSummary {
  id: string;
  driverId: string;
  providerId: string | null;
  status: string;
}

function baseUrl() {
  return (process.env.REQUEST_SERVICE_URL ?? 'http://localhost:4001').replace(/\/+$/, '');
}

async function call(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    throw new HttpError(502, 'request_service_unavailable', 'Request Service is not reachable');
  }
}

export async function getRequest(id: string): Promise<RequestSummary | null> {
  const response = await call(`/requests/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new HttpError(502, 'request_service_error', 'Request Service returned an error');
  }
  const body = (await response.json()) as { request: RequestSummary };
  return body.request;
}

/** Moves the request to Booked. Returns false if the request can no longer be accepted. */
export async function bookRequest(id: string, providerId: string): Promise<boolean> {
  const response = await call(`/requests/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    body: JSON.stringify({ providerId }),
  });
  if (response.status === 409 || response.status === 404) return false;
  if (!response.ok) {
    throw new HttpError(502, 'request_service_error', 'Request Service returned an error');
  }
  return true;
}
