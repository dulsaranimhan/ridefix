# Open questions and data-ownership gaps

The PDF does not say which service owns the data below. Each item has a proposal that keeps the
six-service architecture. These are **proposals**: they become decisions only after the team
agrees.

| #   | Data / feature                           | Why it matters                              | Proposal                                                                                                  |
| --- | ---------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Driver vehicles ("My Vehicles" tab)      | A request needs a selected vehicle          | **Request Service** owns a `vehicles` table, keyed by the driver's Supabase user ID.                      |
| 2   | Disputes                                 | PDF only has a "Disputed" status            | **Request Service** owns a `disputes` table next to the request it belongs to. Admin resolves via API.    |
| 3   | Reviews / ratings                        | Driver flow ends with a review              | **Request Service** owns `reviews` (one per completed request). Matching may keep an average rating copy. |
| 4   | Receipts                                 | Shown in history                            | **Payment Service** builds receipts from its payment records. No new table needed.                        |
| 5   | Provider profile, services, availability | Needed for matching and bid details         | **Matching Service** owns provider profiles, service types offered, base location and availability.       |
| 6   | Request photos                           | Driver can attach photos                    | **Supabase Storage** (configure only). Request Service stores file paths, never the files.                |
| 7   | Admin block/unblock user                 | Needs Supabase service-role key on a server | Undecided. Options: Request Service exposes admin-only endpoints, or use the Supabase dashboard for now.  |
| 8   | Kong JWT method                          | See D19 in decisions.md                     | Check the Supabase project's JWT signing keys before configuring Kong.                                    |
