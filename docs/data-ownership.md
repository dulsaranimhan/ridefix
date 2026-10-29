# RideFix data ownership

Every service owns its database and is the only service allowed to read or write that database's
tables. These are domain boundaries, not proposed SQL schemas. The repository currently has a
Request Service migration; other service-owned databases do not yet have domain schemas.

| Service              | Responsibility in the current architecture              | Current implementation state                                                                                     |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Request Service      | Requests and their lifecycle status                     | Request table and status-transition helper exist. Authentication and ownership enforcement are pending.          |
| Matching Service     | Provider discovery and matching                         | Route lookup exists; provider discovery and matching data are not implemented.                                   |
| Bidding Service      | Bid offers and bid lifecycle                            | Service shell only; bid schema and API are not implemented.                                                      |
| Tracking Service     | Live location data for an active booking                | Socket.IO shell refuses connections until authorization exists; no location schema or API is implemented.        |
| Payment Service      | Payment attempts, provider results, and payment history | Checkout and notification validation exist in fail-closed form; no payment schema or persistence is implemented. |
| Notification Service | Notification rules, device tokens, and delivery state   | Service shell only; schema and API are not implemented.                                                          |

## Boundaries and open ownership proposals

The following entities are not settled as accepted decisions. The linked proposals must not be used to
create tables or code until the owners approve them.

| Entity or decision                                    | Current proposal or gap                                                                                                                                                       | Status                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Driver vehicles                                       | Request Service ownership is proposed because a request selects a vehicle.                                                                                                    | Proposal in `open-questions.md`; no schema.                               |
| Disputes and reviews                                  | Request Service ownership is proposed because they are tied to request completion.                                                                                            | Proposal in `open-questions.md`; no schema.                               |
| Provider profiles, offered services, and availability | Matching Service ownership is proposed.                                                                                                                                       | Proposal in `open-questions.md`; no schema.                               |
| Request photos                                        | Object storage is proposed; Request Service would store references only.                                                                                                      | Storage choice is open.                                                   |
| Booking aggregate / payment order mapping             | No authoritative contract identifies a booking record, links a selected bid to an order, or supplies the payable amount to Payment Service.                                   | Open; blocks safe checkout and booking confirmation.                      |
| Identity and role claims                              | Auth is described as self-hosted in current decisions, while the architecture PDF describes Supabase. Signing method, issuer, claims, and verification keys remain undecided. | D2 says self-hosted auth is user-confirmed but pending; D19 remains open. |

A service may maintain a read-only copy of another service's data only after a specific synchronization
contract is agreed. It must not query or write another service's database directly.
