# apps

Client apps (added in milestone 3):

- `driver-mobile` - React Native + TypeScript. Bottom tabs: Home, My Vehicles, Notifications, Profile.
- `provider-mobile` - React Native + TypeScript. Availability, nearby requests, bids, jobs, location sharing.
- `admin-web` - React + TypeScript. Users/providers, bookings/payments, disputes.

Apps only ever hold **client-safe** values (Supabase URL + anon key, Kong URL, restricted Maps key).
