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
  'Open for bids': ['Awaiting payment', 'Booked', 'Cancelled', 'Expired'],
  // The current MVP has no online payment: a provider accepts an open request directly, which moves
  // it to Booked. Booking from Awaiting payment will need a verified ePay server notification, so
  // this generic transition helper does not allow it.
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
