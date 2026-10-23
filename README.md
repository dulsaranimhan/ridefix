# RideFix

RideFix connects drivers who need roadside help or garage services with nearby providers.
Drivers create a request, compare bids, accept one, pay with PayHere and track the provider live.
Providers receive requests, send bids, manage jobs and share their location. Admins manage users,
providers, bookings, payments and disputes.

Architecture reference: **RideFix_Architecture_Design.pdf**. Short summary:
[docs/architecture.md](docs/architecture.md).

## Status

| Milestone | What                                                  | Status      |
| --------- | ----------------------------------------------------- | ----------- |
| 1         | Inspect architecture PDF, list gaps                   | Done        |
| 2         | Monorepo, shared TypeScript config, env example, docs | Done        |
| 3         | App shells + six service shells with health endpoints | Next        |
| 4-10      | See [docs/milestones.md](docs/milestones.md)          | Not started |

## Repository layout

```
apps/        Driver Mobile, Provider Mobile (React Native + TS), Admin Web (React + TS)
services/    request, matching, bidding, tracking, payment, notification (Node.js + TS)
packages/    shared code; packages/tsconfig holds the shared TypeScript presets
contracts/   API contracts (OpenAPI) and event formats
infra/       Docker Compose, Kong config, PostgreSQL/PostGIS init scripts
docs/        architecture summary, decision log, open questions, milestones
```

## Tech stack

- **Clients:** React Native + TypeScript (driver, provider), React + TypeScript (admin)
- **Auth:** Supabase Auth (no custom auth service)
- **Gateway:** Kong Gateway (configuration only)
- **Services:** six Node.js + TypeScript services, each with its own PostgreSQL database
  (PostGIS for Matching)
- **Integrations:** Google Maps Platform, PayHere (sandbox), Firebase Cloud Messaging
- **Optional:** Redis, RabbitMQ (only when needed)
- **Tooling:** pnpm workspaces, Turborepo, TypeScript 5.9, Prettier, Jest + Supertest

## Getting started

Prerequisites: Node.js 22 (`nvm use`), pnpm 10 (`corepack enable`), Docker Desktop (from milestone 4).

```bash
git clone https://github.com/dulsaranimhan/ridefix.git
cd ridefix
corepack enable
pnpm install
cp .env.example .env      # then fill in your own test/sandbox keys
pnpm typecheck            # runs in every workspace through Turborepo
```

### Run the backend with Docker

```bash
cp .env.example .env                 # set POSTGRES_PASSWORD and SERVICE_DB_PASSWORD
docker compose up --build            # Kong on http://localhost:8000
curl http://localhost:8000/health/request
docker compose --profile optional up --build   # also Redis + RabbitMQ
docker compose down                  # stop (add -v to wipe the databases)
```

### Run the apps

```bash
pnpm --filter admin-web dev          # http://localhost:5173
pnpm --filter driver-mobile dev      # scan the QR code with Expo Go
pnpm --filter provider-mobile dev
```

Useful root scripts: `pnpm build`, `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm format`.
Run one workspace with a filter, for example `pnpm --filter request-service dev` (from milestone 3).

## Security rules (short version)

- Supabase issues the JWT, Kong verifies it, and every service still checks role and ownership.
- Never trust a user ID or role sent in a request body.
- Secrets live in `.env` (git-ignored). Only `.env.example` with placeholders is committed.
- No service-role keys, PayHere secrets or FCM credentials in mobile/web apps.
- A payment is successful only after PayHere's server notification signature is verified.
- Live location is shared only between the driver and provider of an active booking.

## Docs

- [Architecture summary](docs/architecture.md)
- [Decision log](docs/decisions.md)
- [Open questions and data-ownership gaps](docs/open-questions.md)
- [Milestones](docs/milestones.md)
