import { REQUEST_STATUSES, canTransitionRequestStatus } from './status-transitions';

describe('canTransitionRequestStatus', () => {
  const allowed: Record<(typeof REQUEST_STATUSES)[number], readonly string[]> = {
    Created: ['Matching', 'Cancelled'],
    Matching: ['Open for bids', 'Cancelled', 'Expired'],
    'Open for bids': ['Awaiting payment', 'Cancelled', 'Expired'],
    'Awaiting payment': ['Cancelled', 'Expired'],
    Booked: ['On the way', 'Cancelled'],
    'On the way': ['In progress', 'Cancelled'],
    'In progress': ['Completed', 'Disputed'],
    Completed: ['Disputed'],
    Cancelled: [],
    Expired: [],
    Disputed: [],
  };

  it('matches the documented allowed transition map exactly', () => {
    for (const current of REQUEST_STATUSES) {
      for (const next of REQUEST_STATUSES) {
        expect(canTransitionRequestStatus(current, next)).toBe(allowed[current].includes(next));
      }
    }
  });

  it('does not allow booking from Awaiting payment without payment verification', () => {
    expect(canTransitionRequestStatus('Awaiting payment', 'Booked')).toBe(false);
  });
});
