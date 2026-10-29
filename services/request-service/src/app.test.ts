
import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';

jest.mock('./db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from './db';

const mockQuery = pool.query as jest.Mock;

const validRequest = {
  driverId: '550e8400-e29b-41d4-a716-446655440000',
  vehicleId: null,
  serviceType: 'Roadside Assistance',
  problemDescription: 'Car battery is not starting',
  locationLatitude: 6.0535,
  locationLongitude: 80.221,
  locationAddress: 'Galle, Sri Lanka',
};

describe(SERVICE_NAME, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: SERVICE_NAME,
    });
  });

  it('POST /requests creates a request', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: '650e8400-e29b-41d4-a716-446655440000',
          ...validRequest,
          status: 'Created',
        },
      ],
    });

    const res = await request(buildApp()).post('/requests').send(validRequest);

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('Created');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][1]).toEqual([
      validRequest.driverId,
      null,
      validRequest.serviceType,
      validRequest.problemDescription,
      validRequest.locationLatitude,
      validRequest.locationLongitude,
      validRequest.locationAddress,
    ]);
  });

  it('rejects an invalid service type', async () => {
    const res = await request(buildApp())
      .post('/requests')
      .send({ ...validRequest, serviceType: 'Unknown Service' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_service_type');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects invalid coordinates', async () => {
    const res = await request(buildApp())
      .post('/requests')
      .send({ ...validRequest, locationLatitude: 120 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_location_latitude');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects a missing driver ID', async () => {
    const { driverId: _driverId, ...body } = validRequest;

    const res = await request(buildApp()).post('/requests').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_driver_id');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
