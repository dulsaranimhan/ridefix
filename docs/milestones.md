# Milestones

| #   | Milestone                                                                      | Status      |
| --- | ------------------------------------------------------------------------------ | ----------- |
| 1   | Inspect folder and architecture PDF; list conflicts and gaps                   | Done        |
| 2   | pnpm/Turborepo monorepo, shared TypeScript config, env examples, docs          | Done        |
| 3   | Three client app shells and six service shells with health endpoints           | Done        |
| 4   | Docker Compose: Kong + PostgreSQL/PostGIS; Redis and RabbitMQ optional profile | Done        |
| 5   | API contracts, event formats, database ownership, status transitions           | In progress |
| 6   | End-to-end vertical slice (sign in -> request -> bids -> pay -> track -> done) | Not started |
| 7   | Remaining Driver, Provider and Admin screens wired to the APIs                 | Not started |
| 8   | Maps, notifications and payment integrations (sandbox)                         | In progress |
| 9   | Service/API tests and end-to-end checks with mocks                             | Not started |
| 10  | Setup guide, architecture notes, demo data, known limitations, demo script     | Not started |

## Milestone 2 notes

- `node-linker=hoisted` in `.npmrc`: React Native's Metro bundler works more reliably with a flat
  `node_modules` in a pnpm monorepo.
- TypeScript 5.9 is pinned (not 7.x) because React Native and Vite tooling still expect the 5.x
  compiler API.
- Shared tsconfig presets live in `packages/tsconfig`.

## Milestone 3 notes

- Mobile apps use **Expo (SDK 58)** so you can run them on your phone with Expo Go, no Xcode or
  Android Studio needed at first. They extend `expo/tsconfig.base` and use TypeScript 6 as Expo expects.
- Shared colours live in `packages/ui-tokens`; services share `packages/service-kit`.

## Milestone 4 notes

- `compose.yaml` is at the repo root so `docker compose up --build` works from the top folder.
- Postgres init creates `request_db`, `matching_db` (with PostGIS), `bidding_db`, `tracking_db`,
  `payment_db`, `notification_db`, each owned by its own login (`request_svc`, ...). Checked: a
  service login cannot connect to another service's database.
- Kong (DB-less) routes `/requests`, `/matching`, `/bids`, `/tracking`, `/payments`,
  `/notifications`, plus `GET /health/<service>`. Plugins: rate limiting, correlation ID
  (`X-Request-ID`), JSON access log, CORS for Admin Web.
- **Kong does not check JWTs yet.** Add verification after the self-hosted auth service and token
  format are implemented.
- Redis and RabbitMQ start only with `--profile optional`.

## Milestone 8 progress

- Matching exposes `GET /matching/route` using OSRM; the default public demo endpoint is for local
  development only and is rate limited/best-effort. Self-host OSRM or choose a suitable provider
  before production.
- The mobile app config now points at OpenStreetMap raster tiles and includes visible attribution
  text. A map screen is not implemented yet. OSM's community tile server is best-effort and subject
  to its usage policy; it is not a production tile hosting commitment.
- Payment Service validates checkout requests and ePay notification hashes, but currently fails
  closed: it creates no hosted-checkout form and acknowledges no valid notification. Payment/booking
  persistence, idempotency, and booking confirmation remain blocked on approved architecture
  contracts. Sandbox merchant credentials and a public HTTPS notification URL will be needed for
  end-to-end testing after implementation.

## Milestone 5 progress

- Added current OpenAPI contracts for the implemented Request, Matching route, and fail-closed Payment endpoints. Bidding, Tracking, and Notification business APIs remain unimplemented and are not assigned invented endpoint schemas.
- Added an event catalog that records accepted event intents while marking payloads, versioning, and delivery guarantees as undecided.
- Added data-ownership boundaries and the Request Service transition graph. Unresolved ownership proposals remain proposals; no database schema was created.
- Remaining work: resolve auth token verification, provider data ownership, the booking/order-to-bid relationship, payment confirmation API, event payloads, and delivery/idempotency rules before implementing those workflows.
