import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';

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
});
