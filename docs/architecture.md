# RideFix architecture (summary)

The full reference is **RideFix_Architecture_Design.pdf** (C4 diagrams, use cases, user flow,
decision log). This page is a short summary for working in the code. If this page and the PDF
disagree, the PDF wins unless a newer decision is recorded in [decisions.md](decisions.md).

## Building blocks

| Part                 | Technology                           | Ours to code?      | Folder                          |
| -------------------- | ------------------------------------ | ------------------ | ------------------------------- |
| Driver Mobile App    | React Native + TypeScript            | Yes                | `apps/driver-mobile`            |
| Provider Mobile App  | React Native + TypeScript            | Yes                | `apps/provider-mobile`          |
| Admin Web Dashboard  | React + TypeScript                   | Yes                | `apps/admin-web`                |
| Auth                 | Self-hosted auth service             | To implement       | Not present yet                 |
| API Gateway          | Kong Gateway (DB-less, declarative)  | No, configure only | `infra/kong`                    |
| Request Service      | Node.js + Express + TS               | Core code          | `services/request-service`      |
| Matching Service     | Node.js + TS + PostGIS + OSRM        | Integrate + code   | `services/matching-service`     |
| Bidding Service      | Node.js + Express + TS               | Core code          | `services/bidding-service`      |
| Tracking Service     | Node.js + Socket.IO                  | Integrate + code   | `services/tracking-service`     |
| Payment Service      | Node.js + TS + ePay                  | Integrate + code   | `services/payment-service`      |
| Notification Service | Node.js + TS + FCM                   | Integrate + code   | `services/notification-service` |
| Redis, RabbitMQ      | Optional helpers                     | No                 | `infra/` (optional profile)     |

There are exactly **six** custom backend services. Adding a seventh needs an approved change to
the architecture.

## Rules every service follows

1. Layers: Controller -> logic -> Repository -> its own database. Only the Repository writes SQL.
2. Each service owns its PostgreSQL database. No service reads or writes another service's tables.
   Locally, all six databases run on one PostgreSQL server, each with its own login, so the rule is
   still enforced by permissions.
3. Auth and token verification are not implemented yet. When added, services must read the user ID
   and role from a verified token and check role and record ownership. Never trust `userId` or
   `role` from a request body.
4. Main flow uses direct HTTP (Request -> Matching -> Bidding). Events (RabbitMQ, optional) are for
   accept bid, payment done and notifications. Without RabbitMQ, the same events are direct calls.
5. Secrets come from environment variables. Only `.env.example` files with placeholders are
   committed.

## Request status (owned by the Request Service)

```
Created ──> Matching ──> Open for bids ──> Awaiting payment ──> Booked ──> On the way ──> In progress ──> Completed ──> Disputed
   │            │              │                  │                │
   └> Cancelled └> Expired     ├> Expired         └> Cancelled     └> Cancelled
                               └> Cancelled
```

Final states: Cancelled, Expired, Disputed (Completed can move only to Disputed).
A booking becomes **Booked** only after the Payment Service verifies ePay's signed server
notification. Database persistence and booking updates still need implementation.

## Bid status (owned by the Bidding Service)

Submitted -> Accepted | Rejected | Expired | Withdrawn. When one bid is accepted, every other bid on
that request becomes Rejected.

## Payment status (owned by the Payment Service)

Pending -> Paid | Failed; Paid -> Refunded.

The detailed API contracts, event formats and database tables come in milestone 5
(`contracts/` and `docs/data-ownership.md`).
