# apps

Client apps (added in milestone 3):

- `driver-mobile` - React Native + TypeScript. Bottom tabs: Home, My Vehicles, Notifications, Profile.
- `provider-mobile` - React Native + TypeScript. Availability, nearby requests, bids, jobs, location sharing.
- `admin-web` - React + TypeScript. Users/providers, bookings/payments, disputes.

Apps only hold public values such as the Kong URL and OpenStreetMap tile URL. Payment credentials
and database passwords must stay on the server.
