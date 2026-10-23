import express, { type Express, type NextFunction, type Request, type Response } from 'express';

export interface ServiceInfo {
  /** Service name shown in health checks and logs, e.g. "request-service". */
  name: string;
  version?: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Creates an Express app with the parts every RideFix service shares:
 * JSON body parsing, GET /health, a 404 handler and one error handler.
 * `registerRoutes` adds the service's own routes before the 404 handler.
 */
export function createServiceApp(
  info: ServiceInfo,
  registerRoutes?: (app: Express) => void,
): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: info.name,
      version: info.version ?? '0.0.0',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  registerRoutes?.(app);

  app.use((_req, _res, next) => next(new HttpError(404, 'not_found', 'Route not found')));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
      return;
    }
    console.error(`[${info.name}] unexpected error`, err);
    res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
  });

  return app;
}
