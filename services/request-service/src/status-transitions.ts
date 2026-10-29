export const REQUEST_STATUSES = [
  'Created',
  'Matching',
  'Open for bids',
  'Awaiting payment',
  'Booked',
  'On the way',
  'In progress',
  'Completed',
  'Cancelled',
  'Expired',
  'Disputed',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  Created: ['Matching', 'Cancelled'],
  Matching: ['Open for bids', 'Cancelled', 'Expired'],
  'Open for bids': ['Awaiting payment', 'Cancelled', 'Expired'],
  // Booking requires a verified ePay server notification, so it cannot be
  // authorized by this generic transition helper.
  'Awaiting payment': ['Cancelled', 'Expired'],
  Booked: ['On the way', 'Cancelled'],
  'On the way': ['In progress', 'Cancelled'],
  'In progress': ['Completed', 'Disputed'],
  Completed: ['Disputed'],
  Cancelled: [],
  Expired: [],
  Disputed: [],
};

export function canTransitionRequestStatus(current: RequestStatus, next: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}
