# Milestones

| #   | Milestone                                                                      | Status      |
| --- | ------------------------------------------------------------------------------ | ----------- |
| 1   | Inspect folder and architecture PDF; list conflicts and gaps                   | Done        |
| 2   | pnpm/Turborepo monorepo, shared TypeScript config, env examples, docs          | Done        |
| 3   | Three client app shells and six service shells with health endpoints           | Done        |
| 4   | Docker Compose: Kong + PostgreSQL/PostGIS; Redis and RabbitMQ optional profile | Done        |
| 5   | API contracts, event formats, database ownership, status transitions           | Not started |
| 6   | End-to-end vertical slice (sign in -> request -> bids -> pay -> track -> done) | Not started |
| 7   | Remaining Driver, Provider and Admin screens wired to the APIs                 | Not started |
| 8   | Maps, notifications and payment integrations (sandbox)                         | Not started |
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
- **Kong does not check JWTs yet.** That is added in milestone 6 after confirming the Supabase
  signing method (D19).
- Redis and RabbitMQ start only with `--profile optional`.
