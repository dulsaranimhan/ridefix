export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  matchingApiUrl: process.env.EXPO_PUBLIC_MATCHING_API_URL ?? '',
  biddingApiUrl: process.env.EXPO_PUBLIC_BIDDING_API_URL ?? '',
};