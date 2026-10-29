# RideFix contracts

This directory documents what currently crosses RideFix service boundaries. Contracts describe public
behavior only; they do not expose another service's tables.

## Current contracts

| Contract                        | Coverage                                                     | Status                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `request-service.openapi.yaml`  | Create, list, read, and cancel requests                      | Implemented routes; authentication and ownership checks are pending                                                                  |
| `matching-service.openapi.yaml` | OSRM driving route lookup                                    | Implemented development integration; provider discovery is not implemented                                                           |
| `payment-service.openapi.yaml`  | Checkout request validation and ePay notification validation | Implemented fail-closed behavior; checkout, persistence, idempotency, and booking confirmation are blocked on architecture contracts |

All service apps expose `GET /health` through the shared service kit. The Bidding, Tracking, and
Notification service business routes are not implemented yet; this repository does not define
invented endpoint contracts for them.

## Events

See [events.md](events.md). The architecture accepts direct HTTP for the main flow and optional
RabbitMQ for selected events, but event payloads, delivery guarantees, and versioning are not yet
specified. The catalog records known event intents without pretending they are ready-to-publish
schemas.

## Related architecture decisions

- [Data ownership](../docs/data-ownership.md) records accepted service boundaries and unresolved
  ownership proposals without defining database schemas.
- [Request status transitions](../docs/status-transitions.md) documents the implemented transition
  helper and distinguishes it from unimplemented workflow actions.
