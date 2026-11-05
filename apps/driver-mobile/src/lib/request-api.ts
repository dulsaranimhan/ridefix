import { Platform } from 'react-native';
import { config } from '../config';

export type RequestStatus =
  | 'Created'
  | 'Matching'
  | 'Open for bids'
  | 'Awaiting payment'
  | 'Booked'
  | 'On the way'
  | 'In progress'
  | 'Completed'
  | 'Cancelled'
  | 'Expired'
  | 'Disputed';

export interface RideRequest {
  id: string;
  driverId: string;
  providerId: string | null;
  vehicleId: string | null;
  vehicleDescription: string | null;
  serviceType: string;
  problemDescription: string;
  locationLatitude: number;
  locationLongitude: number;
  locationAddress: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type BidStatus = 'Submitted' | 'Accepted' | 'Rejected' | 'Expired' | 'Withdrawn';

export interface Bid {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string;
  priceLkr: number;
  etaMinutes: number;
  distanceKm: number | null;
  note: string | null;
  status: BidStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiErrorBody {
  error?: { message?: string };
}

const REQUEST_TIMEOUT_MS = 10_000;
const apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, '');
const LOOPBACK_URL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i;

export async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  // On a phone, localhost is the phone itself, so the request could never reach the backend.
  if (Platform.OS !== 'web' && LOOPBACK_URL.test(apiBaseUrl)) {
    throw new Error(
      `EXPO_PUBLIC_API_BASE_URL is ${apiBaseUrl}. On a phone, use the LAN IP of the computer running the backend, then restart Expo.`,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error(
      `Cannot reach the RideFix API at ${apiBaseUrl}. Check that the backend is running and this device is on the same network.`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}
