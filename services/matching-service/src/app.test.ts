import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';

jest.mock('./db', () => ({ pool: { query: jest.fn() } }));

import { pool } from './db';

const mockQuery = pool.query as jest.Mock;
const PROVIDER_ID = '650e8400-e29b-41d4-a716-446655440000';

const originalOsrmBaseUrl = process.env.OSRM_BASE_URL;

function osrmResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe(SERVICE_NAME, () => {
  beforeEach(() => {
    process.env.OSRM_BASE_URL = 'https://osrm.test/';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalOsrmBaseUrl === undefined) {
      delete process.env.OSRM_BASE_URL;
    } else {
      process.env.OSRM_BASE_URL = originalOsrmBaseUrl;
    }
  });

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: SERVICE_NAME });
  });

  it('returns a route for valid coordinates using the OSRM response format', async () => {
    const geometry = {
      type: 'LineString',
      coordinates: [
        [80.0, 6.0],
        [80.1, 6.1],
      ],
    };
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      osrmResponse({
        code: 'Ok',
        routes: [{ distance: 1250.5, duration: 180, geometry }],
      }),
    );

    const res = await request(buildApp()).get(
      '/matching/route?fromLng=80&fromLat=6&toLng=80.1&toLat=6.1',
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      provider: 'osrm',
      distanceMeters: 1250.5,
      durationSeconds: 180,
      geometry,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://osrm.test/route/v1/driving/80,6;80.1,6.1?overview=full&geometries=geojson',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it.each([
    ['/matching/route?fromLat=6&toLng=80.1&toLat=6.1', 'missing coordinate'],
    ['/matching/route?fromLng=abc&fromLat=6&toLng=80.1&toLat=6.1', 'non-numeric coordinate'],
    ['/matching/route?fromLng=181&fromLat=6&toLng=80.1&toLat=6.1', 'longitude out of range'],
    ['/matching/route?fromLng=80&fromLat=-91&toLng=80.1&toLat=6.1', 'latitude out of range'],
  ])('rejects %s (%s)', async (path) => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');

    const res = await request(buildApp()).get(path);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'invalid_coordinates' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 404 when OSRM reports that no route exists', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(osrmResponse({ code: 'NoRoute', routes: [] }));

    const res = await request(buildApp()).get(
      '/matching/route?fromLng=80&fromLat=6&toLng=80.1&toLat=6.1',
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'route_not_found' });
  });

  it('returns 502 when OSRM returns a failed HTTP response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse({}, 503));

    const res = await request(buildApp()).get(
      '/matching/route?fromLng=80&fromLat=6&toLng=80.1&toLat=6.1',
    );

    expect(res.status).toBe(502);
    expect(res.body.error).toMatchObject({ code: 'routing_unavailable' });
  });

  it('returns 502 when the OSRM request fails at the network layer', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    const res = await request(buildApp()).get(
      '/matching/route?fromLng=80&fromLat=6&toLng=80.1&toLat=6.1',
    );

    expect(res.status).toBe(502);
    expect(res.body.error).toMatchObject({ code: 'routing_unavailable' });
  });

  it('uses an eight-second abort timeout and returns 502 when it expires', async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutMock = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));

    const res = await request(buildApp()).get(
      '/matching/route?fromLng=80&fromLat=6&toLng=80.1&toLat=6.1',
    );

    expect(timeoutMock).toHaveBeenCalledWith(8000);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: timeoutSignal }),
    );
    expect(res.status).toBe(502);
    expect(res.body.error).toMatchObject({ code: 'routing_unavailable' });
  });

  describe('provider availability', () => {
    beforeEach(() => mockQuery.mockReset());

    it('reports a provider with no saved value as offline', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(buildApp()).get(`/matching/providers/${PROVIDER_ID}/availability`);

      expect(res.status).toBe(200);
      expect(res.body.availability).toEqual({
        providerId: PROVIDER_ID,
        isAvailable: false,
        updatedAt: null,
      });
    });

    it('saves availability', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ providerId: PROVIDER_ID, isAvailable: true }] });

      const res = await request(buildApp())
        .put(`/matching/providers/${PROVIDER_ID}/availability`)
        .send({ isAvailable: true });

      expect(res.status).toBe(200);
      expect(res.body.availability.isAvailable).toBe(true);
      expect(mockQuery.mock.calls[0][1]).toEqual([PROVIDER_ID, true]);
    });

    it('rejects an invalid provider ID and value', async () => {
      const badId = await request(buildApp()).get('/matching/providers/nope/availability');
      const badValue = await request(buildApp())
        .put(`/matching/providers/${PROVIDER_ID}/availability`)
        .send({ isAvailable: 'yes' });

      expect(badId.body.error.code).toBe('invalid_provider_id');
      expect(badValue.body.error.code).toBe('invalid_availability');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
