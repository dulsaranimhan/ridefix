# Open questions and data-ownership gaps

The PDF does not say which service owns the data below. Each item has a proposal that keeps the
six-service architecture. These are **proposals**: they become decisions only after the team
agrees.

| #   | Data / feature                           | Why it matters                              | Proposal                                                                                                  |
| --- | ---------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Driver vehicles ("My Vehicles" tab)      | A request needs a selected vehicle          | **Request Service** owns a `vehicles` table, keyed by the driver's self-hosted auth user ID.              |
| 2   | Disputes                                 | PDF only has a "Disputed" status            | **Request Service** owns a `disputes` table next to the request it belongs to. Admin resolves via API.    |
| 3   | Reviews / ratings                        | Driver flow ends with a review              | **Request Service** owns `reviews` (one per completed request). Matching may keep an average rating copy. |
| 4   | Receipts                                 | Shown in history                            | **Payment Service** builds receipts from its payment records. No new table needed.                        |
| 5   | Provider profile, services, availability | Needed for matching and bid details         | **Matching Service** owns provider profiles, service types offered, base location and availability.       |
| 6   | Request photos                           | Driver can attach photos                    | Choose self-hosted object storage; Request Service stores file paths, never the files.                    |
| 7   | Admin block/unblock user                 | Requires privileged auth operation          | Define an admin-only endpoint in the self-hosted auth service or a suitable domain service.              |
| 8   | Auth token verification                  | Kong and services need a trust contract      | Decide token format, signing keys and validation approach with the self-hosted auth implementation.     |
