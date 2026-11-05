# Event catalog and contract status

The accepted architecture decision is direct HTTP for the main synchronous flow, with optional
RabbitMQ for selected asynchronous work. No event publisher or consumer is implemented in this
repository yet. Payload schemas and delivery behavior remain undefined; consumers must not assume
these events are available.

| Intent in the architecture  | Likely owner / source                                                               | Contract status | Missing decisions before implementation                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Bid accepted                | Bidding Service initiates; Request Service owns request status                      | Not contracted  | Event name, request/bid identifiers, atomic acceptance, duplicate delivery handling, and failure recovery            |
| Payment completed           | Payment Service verifies provider notification; Request Service owns request status | Not contracted  | Authoritative order mapping, payment record key, request confirmation API/event, idempotency key, and retry behavior |
| Push notification requested | Domain services produce; Notification Service sends                                 | Not contracted  | Which domain events trigger a push, recipient resolution, event payload, and delivery/retry policy                   |

## Contract rules for future events

Before publishing an event, define and review its stable name, versioning policy, producer, consumer,
required fields, identifier semantics, delivery guarantees, retry/dead-letter behavior, and duplicate
handling. The payload must contain service-level identifiers and data needed by consumers; it must
not expose another service's database row or require consumers to query another service's tables.

This file intentionally does not prescribe an envelope or payload fields. The current architecture
notes identify event intents, but do not define those wire-level details. Record approved details
here and in a machine-readable schema only after the owning services agree.
