# Driver app and shared API guide

The Driver, Provider, and Web apps all use the same Request Service API and database through Kong.
This guide covers running the Driver app and what the other app owners need to connect.

## Current limit: identity is not verified

`driverId` and `providerId` are plain request values. Kong does not verify Supabase JWTs yet, and the
Request Service has no token or ownership checks. Anyone who can reach the API can read requests, or
act as another driver or provider. Use this setup for trusted local development and demos only. It is
not production identity verification.

## Run the backend on the host computer

```bash
cp .env.example .env   # first time only; set the passwords
docker compose up --build
curl http://localhost:8000/health/request
```

Migrations in `services/request-service/migrations` are applied when the Request Service starts.

## Choose the API base URL

Kong (port 8000) is the only public entry point. Do not use port 4001 from another device, because
Docker Compose does not publish it.

| Where the app runs                | `EXPO_PUBLIC_API_BASE_URL`     |
| --------------------------------- | ------------------------------ |
| Browser on the host computer      | `http://localhost:8000`        |
| iPhone or another computer        | `http://<host LAN IP>:8000`    |
| Android emulator on the host      | `http://10.0.2.2:8000`         |
| Any device, with a hosted backend | The shared backend's HTTPS URL |

On a Mac, find the LAN IP with:

```bash
ipconfig getifaddr en0
```

The LAN IP can change when the network changes. All devices must be on the same network, and the
firewall on the host must allow port 8000.

## Run the Driver app on an iPhone with Expo Go

1. In `apps/driver-mobile/.env` set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the
   anon or publishable key only), and `EXPO_PUBLIC_API_BASE_URL` with the LAN IP.
2. Start Expo with a clean cache, so the new values are bundled:

   ```bash
   cd ~/Documents/ridefix/apps/driver-mobile
   npx expo start --clear
   ```

3. Sign in to the same Expo account in the Expo CLI and in Expo Go.
4. Scan the QR code. If it says "No usable data", enter the `exp://...` URL from the terminal manually
   in Expo Go.
5. Native packages must match the versions Expo Go ships (see `expo/bundledNativeModules.json`). A
   newer `async-storage` shows "Native module is null" in Expo Go.
6. If iOS asks for Local Network access for Expo Go, allow it.
7. Sign in from Profile, then send a request from Home.

If the request fails, the Home screen shows the API URL it tried. A `localhost` value on a phone is
reported directly, because localhost there means the phone itself.

## Secrets

- `EXPO_PUBLIC_*` values are bundled into the app, so they are public.
- Never put a Supabase service-role or secret key, payment secret, or database password in an app.
- `.env` files stay out of source control. `.env.example` files contain placeholders only.

## Connect the Provider app and Admin Web

Each app owner sets the API URL and calls Kong. The app code stays with its owner. The contracts are
[`request-service.openapi.yaml`](../contracts/request-service.openapi.yaml) and
[`bidding-service.openapi.yaml`](../contracts/bidding-service.openapi.yaml).

### Provider app settings

```
EXPO_PUBLIC_API_BASE_URL=http://<host LAN IP>:8000
EXPO_PUBLIC_PROVIDER_ID=<a UUID unique to this provider>
```

Until real provider identity exists, each person testing needs their own UUID. Two people using the
same UUID appear as one provider. The app also sends a provider name with each bid.

### Provider app flow

| Step                     | Call                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| 1. See open requests     | `GET /requests/open`                                                                    |
| 2. Send an offer         | `POST /bids` with `requestId`, `providerId`, `providerName`, `priceLkr`, `etaMinutes`   |
| 3. See own offers        | `GET /bids?providerId=<uuid>`                                                           |
| 4. Withdraw an offer     | `POST /bids/{id}/withdraw` with `{ "providerId": "<uuid>" }`                            |
| 5. See won jobs          | `GET /requests/assigned?providerId=<uuid>`                                              |
| 6. Update the job status | `PATCH /requests/{id}/status` with `{ "providerId": "<uuid>", "status": "On the way" }` |

`distanceKm` and `note` are optional in `POST /bids`. Job status order after a bid is accepted is
`Booked → On the way → In progress → Completed`.

Replace any call to `POST /requests/{id}/accept` in the Provider app with `POST /bids`. A direct accept
skips the driver's choice, because the Bidding Service now makes that call when a driver accepts a bid.

### Admin Web settings and calls

```
VITE_API_BASE_URL=http://<host LAN IP>:8000
```

| Need                | Call                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| Bids by status      | `GET /bids?status=Submitted` (or Accepted, Rejected, Expired, Withdrawn) |
| Bids on a request   | `GET /bids?requestId=<uuid>`                                             |
| Bids by a provider  | `GET /bids?providerId=<uuid>`                                            |
| Open requests       | `GET /requests/open`                                                     |
| One request         | `GET /requests/{id}`                                                     |
| A driver's requests | `GET /requests?driverId=<uuid>`                                          |

There is no endpoint yet that lists all requests, users, or payments. Adding one should wait for admin
authentication, because the API is otherwise open to anyone who can reach it.

A browser app must be served from an origin in the Kong `cors` list in `infra/kong/kong.yml`, currently
`http://localhost:5173`, `:8081`, and `:8082`. Opening the page through a LAN IP origin is blocked until
that origin is added. A browser at `http://localhost:5173` on a teammate's own computer can call the
host's LAN IP. Native apps are not affected by CORS.

### Check the connection from another computer

```bash
curl http://<host LAN IP>:8000/health/request
```

```bash
curl http://<host LAN IP>:8000/health/bidding
```

Errors have the shape `{ "error": { "code": "...", "message": "..." } }`. A `409` usually means the
request or bid is no longer open, or the provider already has an open bid on that request.

## What the Driver app UI uses today

The screens follow the RideFix Driver UI export. This is where each part gets its data:

| Part                                         | Source                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| Sign-in, sign-up, log out                    | Supabase Auth                                               |
| Send, list, cancel, and track request status | Request Service API, refreshed every 4 seconds              |
| Notifications                                | Built in the app from the driver's requests                 |
| My Vehicles                                  | Saved on this device only, because no backend owns them yet |
| Current location button                      | Device GPS through `expo-location`, or typed in             |
| Offers, Compare, offer details, Confirm      | Bidding Service API, refreshed every 4 seconds              |
| Maps and live tracking                       | Drawn illustration, labelled in the app                     |

## Other limits

- Payment is a placeholder. Accepting a bid books the request straight away and the driver pays cash.
- Bids expire after `BID_EXPIRY_MINUTES` (15 by default). Bids on a cancelled request stay open until
  they expire, but cannot be accepted.
- Provider ratings, reviews, and profile details are not shown, because no service stores provider
  profiles yet. The provider name is a value the Provider app sends with each bid.
- The API has no "Arrived" status, so the tracking steps are Booked, On the way, In progress, and
  Completed. Notifications show only the latest status of each request.
- Photos, call, message, receipts, ratings, and profile editing are not connected. The app says so
  when one is tapped.
- There are no push notifications or live location yet.
- Drivers can cancel from the app only while a request is `Open for bids`.
- Supabase email confirmation links open the Supabase project's Site URL, not the app.
- If `pnpm` reports "no native binary", use `corepack pnpm`, which runs the version this repo pins.
