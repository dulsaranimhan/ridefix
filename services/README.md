# services

The six RideFix backend services (added in milestone 3). Each one has its own database and the
same layers: Controller -> logic -> Repository.

| Service                | Port | Owns                                                |
| ---------------------- | ---- | --------------------------------------------------- |
| `request-service`      | 4001 | Requests and request status changes                 |
| `matching-service`     | 4002 | Provider locations, services offered, nearby search |
| `bidding-service`      | 4003 | Bids and bid status                                 |
| `tracking-service`     | 4004 | Live location during an active booking (Socket.IO)  |
| `payment-service`      | 4005 | ePay hosted checkout and signed payment notifications |
| `notification-service` | 4006 | Notification rules and FCM device tokens            |
