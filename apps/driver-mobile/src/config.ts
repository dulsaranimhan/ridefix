// Client-safe settings only. EXPO_PUBLIC_* values are bundled into the app.
export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  mapTileUrl:
    process.env.EXPO_PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution: '© OpenStreetMap contributors',
};
