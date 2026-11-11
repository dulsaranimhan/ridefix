import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, requestApi, setAuthToken } from './request-api';

/** A RideFix account, as auth-service returns it. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'driver' | 'provider' | 'admin';
  status: 'active' | 'blocked';
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'ridefix:auth-token';
const USER_KEY = 'ridefix:auth-user';

async function saveSession({ token, user }: AuthResponse): Promise<AuthUser> {
  if (user.role !== 'driver') {
    throw new Error('This is not a driver account. Use the RideFix Provider app instead.');
  }
  setAuthToken(token);
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
  return user;
}

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<AuthUser> {
  const result = await requestApi<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, role: 'driver' }),
  });
  return saveSession(result);
}

export async function login(input: { email: string; password: string }): Promise<AuthUser> {
  const result = await requestApi<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return saveSession(result);
}

export async function logout(): Promise<void> {
  setAuthToken(null);
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

/**
 * Restores the saved session when the app starts. Returns the cached user straight away, then
 * `refresh` checks the token with GET /auth/me. A rejected token (401/403) signs the user out;
 * a network error keeps the cached user so the app still works while the backend is down.
 */
export async function restoreSession(): Promise<{
  user: AuthUser | null;
  refresh(): Promise<AuthUser | null>;
}> {
  const [[, token], [, savedUser]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token || !savedUser) return { user: null, refresh: async () => null };

  setAuthToken(token);
  const cached = JSON.parse(savedUser) as AuthUser;
  return {
    user: cached,
    async refresh() {
      try {
        const { user } = await requestApi<{ user: AuthUser }>('/auth/me');
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await logout();
          return null;
        }
        return cached;
      }
    },
  };
}
