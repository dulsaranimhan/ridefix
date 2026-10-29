# Request status transitions

The Request Service owns request status. The table below reflects `canTransitionRequestStatus` in the
current source, not an end-to-end workflow guarantee. Authentication, authorized actors, and the
service-to-service calls that trigger several transitions are not yet implemented.

| Current status   | Allowed next status                  | Notes                                                                                                          |
| ---------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Created          | Matching, Cancelled                  | Matching is initiated by the workflow; current Request API does not expose that transition.                    |
| Matching         | Open for bids, Cancelled, Expired    | Matching integration is not wired to the Request Service.                                                      |
| Open for bids    | Awaiting payment, Cancelled, Expired | Bid acceptance endpoint is not implemented.                                                                    |
| Awaiting payment | Cancelled, Expired                   | `Booked` is intentionally absent from the generic helper; payment confirmation integration is not implemented. |
| Booked           | On the way, Cancelled                | Provider job-update workflow is not implemented.                                                               |
| On the way       | In progress, Cancelled               | Provider job-update workflow is not implemented.                                                               |
| In progress      | Completed, Disputed                  | Completion and dispute APIs are not implemented.                                                               |
| Completed        | Disputed                             | Dispute API is not implemented.                                                                                |
| Cancelled        | None                                 | Final state.                                                                                                   |
| Expired          | None                                 | Final state.                                                                                                   |
| Disputed         | None                                 | Final state.                                                                                                   |

The architecture says a request becomes `Booked` only after a verified payment notification. The
Payment Service currently has no persistence or Request Service confirmation contract and therefore
returns `503` for a valid notification instead of confirming a booking. Do not add an alternate
transition path until that cross-service contract is approved and implemented idempotently.
