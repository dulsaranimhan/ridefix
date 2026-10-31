import { createServiceApp } from '@ridefix/service-kit';
import { Router } from 'express';
import bidRoutes from './routes/bidRoutes';

export const SERVICE_NAME = 'bidding-service';

export function buildApp() {
  return createServiceApp(
    { name: SERVICE_NAME },
    (app) => {
      app.use('/bids', bidRoutes);
    }
  );
}