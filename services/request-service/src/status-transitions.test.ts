import { canTransitionRequestStatus } from './status-transitions';

describe('canTransitionRequestStatus', () => {
  it('allows Created to Matching', () => {
    expect(canTransitionRequestStatus('Created', 'Matching')).toBe(true);
  });

  it('allows Completed to Disputed', () => {
    expect(canTransitionRequestStatus('Completed', 'Disputed')).toBe(true);
  });

  it('rejects Completed to Matching', () => {
    expect(canTransitionRequestStatus('Completed', 'Matching')).toBe(false);
  });

  it('rejects transitions from Cancelled', () => {
    expect(canTransitionRequestStatus('Cancelled', 'Matching')).toBe(false);
  });

  it('rejects transitions from Expired', () => {
    expect(canTransitionRequestStatus('Expired', 'Booked')).toBe(false);
  });

  it('rejects transitions from Disputed', () => {
    expect(canTransitionRequestStatus('Disputed', 'Completed')).toBe(false);
  });
});
