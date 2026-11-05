# RideFix Bidding Feature

This update adds provider-side bid submission and the bidding API workflow to the existing RideFix project.

## Provider app

On the Provider app's Jobs screen, an available provider can select **Place a Bid**, enter a price in LKR and estimated arrival time in minutes, and submit the bid. The screen shows the bid status and prevents the provider from submitting a second bid for the same request.

## Bidding API

The Bidding Service is exposed on port 4003.

- `POST /bids` — submit a bid (`requestId`, `providerId`, `price`, `estimatedTimeMinutes`).
- `GET /bids/request/:requestId` — list bids for a driver's request.
- `GET /bids/provider/:providerId` — list a provider's submitted bids.
- `PATCH /bids/:bidId/status` — accept or reject a pending bid (`{"status":"Accepted"}` or `{"status":"Rejected"}`). Accepting a bid rejects the other pending bids for that request in one database transaction.

The existing `bids` table migration is retained. Run it against `bidding_db` if it has not already been applied:

```powershell
docker compose exec -T postgres psql -U ridefix -d bidding_db < services/bidding-service/migrations/001_create_bids.sql
```

If the database role does not permit the command above, run the SQL using the `bidding_svc` database role / your existing migration procedure.

## Mobile environment

In `apps/provider-mobile/.env`, configure these client-safe URLs for Android Emulator:

```env
EXPO_PUBLIC_PROVIDER_API_URL=http://10.0.2.2:4007
EXPO_PUBLIC_MATCHING_API_URL=http://10.0.2.2:4002
EXPO_PUBLIC_BIDDING_API_URL=http://10.0.2.2:4003
```

Do not put database passwords or Supabase service-role keys in the mobile `.env` file.

## Start / rebuild

From the repository root:

```powershell
pnpm install
docker compose up -d --build bidding-service provider-service matching-service
pnpm --filter provider-mobile dev
```

The request and matching services currently provide open requests. The request owner / driver-facing bid review UI is not part of the existing provider-mobile app; the request-side API endpoints above are ready for a driver client to consume.

## Important security note

The current service endpoints use the provider/request UUID supplied by the client. Before production deployment, enforce Supabase JWT authentication and verify that the authenticated user owns the provider or driver record. Do not treat client-supplied IDs as authorization.
