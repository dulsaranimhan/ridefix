# Decision log

D1 to D16 come from the architecture PDF (section 6) and are **accepted**. New decisions are added
below with a status. A proposed decision is not used in code until it is accepted.

| #   | Decision                 | Choice                                                          | Status                   |
| --- | ------------------------ | --------------------------------------------------------------- | ------------------------ |
| D1  | Architecture style       | Microservices, one per business area                            | Accepted                 |
| D2  | Login and accounts       | Supabase Auth                                                   | Accepted                 |
| D3  | Who checks the token     | Supabase issues, Kong checks, services read user ID and role    | Accepted                 |
| D4  | API gateway              | Kong Gateway with a configuration file                          | Accepted                 |
| D5  | Backend language         | Node.js + Express + TypeScript                                  | Accepted                 |
| D6  | Databases                | PostgreSQL per service, PostGIS for Matching                    | Accepted                 |
| D7  | Maps and routes          | Google Maps Platform                                            | Accepted                 |
| D8  | Live tracking            | Socket.IO                                                       | Accepted                 |
| D9  | Online payments          | PayHere (hosted checkout, sandbox in development)               | Accepted                 |
| D10 | Push notifications       | Firebase Cloud Messaging                                        | Accepted                 |
| D11 | Service-to-service calls | Direct HTTP for main flow; events for accept bid, payment, push | Accepted                 |
| D12 | Cache and broker         | Redis and RabbitMQ optional                                     | Accepted                 |
| D13 | Mobile apps              | React Native + TypeScript                                       | Accepted                 |
| D14 | Admin dashboard          | React + TypeScript                                              | Accepted                 |
| D15 | Packaging                | Docker Compose (no Kubernetes)                                  | Accepted                 |
| D16 | Testing                  | Jest + Supertest, mocks for PayHere, FCM and Google Maps        | Accepted                 |
| D17 | Monorepo tooling         | pnpm workspaces + Turborepo                                     | Accepted (master prompt) |
| D18 | Role claim location      | Role stored in Supabase `app_metadata`, not `user_metadata`     | Proposed                 |
| D19 | Kong JWT verification    | Match the Supabase project's signing method (see below)         | Open                     |
| D20 | Data owners for gaps     | See [open-questions.md](open-questions.md)                      | Proposed                 |

## Notes

**D18.** Supabase users can change their own `user_metadata`, so a role stored there could be
faked. `app_metadata` can only be changed with the service-role key, so the role goes there and
appears in the JWT as `app_metadata.role`. Services read it from the verified token only.

**D19.** Kong's open-source `jwt` plugin verifies HS256 with a shared secret, or RS256/ES256 with a
fixed public key. Newer Supabase projects sign with asymmetric keys published as a JWKS. Before
calling Kong auth "done" we must check which method the RideFix Supabase project uses, put the
right key in Kong's config, and prove that a valid token passes and a bad/expired token is
rejected. Supabase tokens also need the `iss` claim mapped to the Kong consumer key.
