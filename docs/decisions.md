# Decision log

D1 to D16 come from the architecture PDF (section 6) and are **accepted**. New decisions are added
below with a status. A proposed decision is not used in code until it is accepted.

| #   | Decision                 | Choice                                                          | Status                   |
| --- | ------------------------ | --------------------------------------------------------------- | ------------------------ |
| D1  | Architecture style       | Microservices, one per business area                            | Accepted                 |
| D2  | Login and accounts       | Supabase Auth for Sprint 1 MVP; self-hosted migration after evaluation | User confirmed; MVP implementation |
| D3  | Who checks the token     | Supabase issues tokens; Kong/services verify them               | Pending implementation   |
| D4  | API gateway              | Kong Gateway with a configuration file                          | Accepted                 |
| D5  | Backend language         | Node.js + Express + TypeScript                                  | Accepted                 |
| D6  | Databases                | PostgreSQL per service, PostGIS for Matching                    | Accepted                 |
| D7  | Maps and routes          | OpenStreetMap data/tiles, OSRM routing                         | User selected; dev setup |
| D8  | Live tracking            | Socket.IO                                                       | Accepted                 |
| D9  | Online payments          | ePay hosted checkout and signed notifications                  | User selected; sandbox  |
| D10 | Push notifications       | Firebase Cloud Messaging                                        | Accepted                 |
| D11 | Service-to-service calls | Direct HTTP for main flow; events for accept bid, payment, push | Accepted                 |
| D12 | Cache and broker         | Redis and RabbitMQ optional                                     | Accepted                 |
| D13 | Mobile apps              | React Native + TypeScript                                       | Accepted                 |
| D14 | Admin dashboard          | React + TypeScript                                              | Accepted                 |
| D15 | Packaging                | Docker Compose (no Kubernetes)                                  | Accepted                 |
| D16 | Testing                  | Jest + Supertest, mocks for ePay, FCM and OSRM                  | Accepted (update)        |
| D17 | Monorepo tooling         | pnpm workspaces + Turborepo                                     | Accepted (master prompt) |
| D18 | Role claim location      | Role stored in Supabase `app_metadata`, not `user_metadata`     | Superseded by D2         |
| D19 | Kong JWT verification    | Supabase JWT verification for the MVP; re-evaluate after self-hosted migration | Open          |
| D20 | Data owners for gaps     | See [open-questions.md](open-questions.md)                      | Proposed                 |

## Notes

**D18.** Supabase Auth is used for the Sprint 1 MVP. Role-claim policy and backend authorization
remain open; client sign-in does not by itself authorize service actions.

**D19.** Kong and services still need a defined verification contract for Supabase JWTs, including
issuer, claims and key rotation. Revisit the contract if auth is migrated after evaluation.

**Provider and auth updates.** Google Maps/PayHere were replaced in the planned stack by OSM/OSRM
and ePay following the user's request. The current integration is an initial routing/checkout
adapter; map screens, payment persistence and booking updates still need implementation. Database
ownership remains per service under D6; no shared-database decision is recorded. Public OSM tiles
and the OSRM demo are for development only.
