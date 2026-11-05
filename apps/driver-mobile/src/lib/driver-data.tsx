import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { requestApi, type Bid, type RideRequest } from './request-api';
import { supabase } from './supabase';

export type VehicleKind = 'car' | 'suv' | 'motorbike' | 'van';

/** Saved on this device only. The vehicle data owner is still an open backend decision. */
export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  kind: VehicleKind;
  isDefault: boolean;
}

export type NotificationGroup = 'Requests' | 'Bids' | 'Bookings' | 'System';

export interface DriverNotification {
  id: string;
  group: NotificationGroup;
  status:
    | 'bid'
    | 'submitted'
    | 'confirmed'
    | 'enRoute'
    | 'progress'
    | 'completed'
    | 'cancelled'
    | 'welcome';
  title: string;
  body: string;
  at: string;
}

export interface Place {
  address: string;
  latitude: number;
  longitude: number;
}

export interface NewRequest {
  serviceType: string;
  vehicleDescription: string | null;
  problemDescription: string;
  place: Place;
}

interface DriverData {
  authConfigured: boolean;
  user: User | null;
  displayName: string;
  requests: RideRequest[];
  activeRequest: RideRequest | null;
  /** Every bid on the driver's latest request. */
  bids: Bid[];
  refreshError: string;
  vehicles: Vehicle[];
  defaultVehicle: Vehicle | null;
  addVehicle(input: Pick<Vehicle, 'name' | 'plate' | 'kind'>): Vehicle;
  removeVehicle(id: string): void;
  setDefaultVehicle(id: string): void;
  place: Place;
  setPlace(place: Place): void;
  createRequest(input: NewRequest): Promise<RideRequest>;
  cancelRequest(id: string): Promise<void>;
  acceptBid(bid: Bid): Promise<void>;
  rejectBid(bid: Bid): Promise<void>;
  notifications: DriverNotification[];
  unreadCount: number;
  isUnread(notification: DriverNotification): boolean;
  markNotificationsRead(): void;
}

const DEMO_PLACE: Place = {
  address: 'Galle, Sri Lanka',
  latitude: 6.0535,
  longitude: 80.221,
};

const ACTIVE_STATUSES = new Set(['Open for bids', 'Booked', 'On the way', 'In progress']);
const REFRESH_MS = 4000;

function logStorageError(error: unknown) {
  console.warn('[driver-mobile] could not use device storage', error);
}

const DriverDataContext = createContext<DriverData | null>(null);

function buildNotifications(
  user: User | null,
  requests: RideRequest[],
  bids: Bid[],
): DriverNotification[] {
  const items: DriverNotification[] = [];
  if (user) {
    items.push({
      id: 'welcome',
      group: 'System',
      status: 'welcome',
      title: 'Welcome to RideFix!',
      body: 'Thank you for joining RideFix.',
      at: user.created_at,
    });
  }

  for (const request of requests) {
    const service = request.serviceType;
    items.push({
      id: `${request.id}:submitted`,
      group: 'Requests',
      status: 'submitted',
      title: 'Request Submitted',
      body: `Your ${service} request has been submitted.`,
      at: request.createdAt,
    });

    // The API stores only the current status, so only the latest change can be shown.
    const latest: Partial<Record<RideRequest['status'], Omit<DriverNotification, 'id' | 'at'>>> = {
      Booked: {
        group: 'Bookings',
        status: 'confirmed',
        title: 'Provider Confirmed',
        body: `A provider accepted your ${service} request.`,
      },
      'On the way': {
        group: 'Bookings',
        status: 'enRoute',
        title: 'Provider En Route',
        body: 'Your provider is on the way.',
      },
      'In progress': {
        group: 'Bookings',
        status: 'progress',
        title: 'Service In Progress',
        body: 'Your provider is working on your vehicle.',
      },
      Completed: {
        group: 'Bookings',
        status: 'completed',
        title: 'Service Completed',
        body: `Your ${service} service has been completed.`,
      },
      Cancelled: {
        group: 'Requests',
        status: 'cancelled',
        title: 'Request Cancelled',
        body: `Your ${service} request was cancelled.`,
      },
    };
    const change = latest[request.status];
    if (change)
      items.push({ ...change, id: `${request.id}:${request.status}`, at: request.updatedAt });
  }

  for (const bid of bids) {
    if (bid.status !== 'Submitted') continue;
    items.push({
      id: `bid:${bid.id}`,
      group: 'Bids',
      status: 'bid',
      title: 'New Bid Received',
      body: `${bid.providerName} offered ${formatLkr(bid.priceLkr)} for your request.`,
      at: bid.createdAt,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export function DriverDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [refreshError, setRefreshError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [place, setPlace] = useState<Place>(DEMO_PLACE);
  const [lastSeenAt, setLastSeenAt] = useState('');
  // Bumped after each create or cancel so a slower, older refresh cannot overwrite the new result.
  const requestVersion = useRef(0);

  const userId = user?.id ?? null;
  const storageOwner = userId ?? 'guest';
  const vehiclesKey = `ridefix:vehicles:${storageOwner}`;
  const seenKey = `ridefix:notifications-seen:${storageOwner}`;

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    void supabase.auth.getSession().then(({ data: sessionData }) => {
      setUser(sessionData.session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(vehiclesKey), AsyncStorage.getItem(seenKey)])
      .then(([savedVehicles, savedSeenAt]) => {
        if (!active) return;
        setVehicles(savedVehicles ? (JSON.parse(savedVehicles) as Vehicle[]) : []);
        setLastSeenAt(savedSeenAt ?? '');
      })
      .catch(logStorageError);
    return () => {
      active = false;
    };
  }, [vehiclesKey, seenKey]);

  useEffect(() => {
    if (!userId) {
      setRequests([]);
      setBids([]);
      setRefreshError('');
      return;
    }

    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      const startedAtVersion = requestVersion.current;
      try {
        const result = await requestApi<{ requests: RideRequest[] }>(
          `/requests?driverId=${encodeURIComponent(userId)}`,
        );
        if (!active || startedAtVersion !== requestVersion.current) return;
        setRequests(result.requests);
        const latest = result.requests[0];
        const bidResult = latest
          ? await requestApi<{ bids: Bid[] }>(`/bids?requestId=${encodeURIComponent(latest.id)}`)
          : { bids: [] };
        if (active && startedAtVersion === requestVersion.current) {
          setBids(bidResult.bids);
          setRefreshError('');
        }
      } catch (error) {
        if (active) {
          setRefreshError(error instanceof Error ? error.message : 'Could not load your requests.');
        }
      } finally {
        refreshing = false;
      }
    };

    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);

  const saveVehicles = useCallback(
    (next: Vehicle[]) => {
      setVehicles(next);
      AsyncStorage.setItem(vehiclesKey, JSON.stringify(next)).catch(logStorageError);
    },
    [vehiclesKey],
  );

  const addVehicle = useCallback<DriverData['addVehicle']>(
    (input) => {
      const vehicle: Vehicle = {
        ...input,
        id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        isDefault: vehicles.length === 0,
      };
      saveVehicles([...vehicles, vehicle]);
      return vehicle;
    },
    [saveVehicles, vehicles],
  );

  const removeVehicle = useCallback(
    (id: string) => {
      const remaining = vehicles.filter((vehicle) => vehicle.id !== id);
      const hasDefault = remaining.some((vehicle) => vehicle.isDefault);
      saveVehicles(
        remaining.map((vehicle, index) =>
          !hasDefault && index === 0 ? { ...vehicle, isDefault: true } : vehicle,
        ),
      );
    },
    [saveVehicles, vehicles],
  );

  const setDefaultVehicle = useCallback(
    (id: string) => {
      saveVehicles(vehicles.map((vehicle) => ({ ...vehicle, isDefault: vehicle.id === id })));
    },
    [saveVehicles, vehicles],
  );

  const createRequest = useCallback<DriverData['createRequest']>(
    async ({ serviceType, vehicleDescription, problemDescription, place: requestPlace }) => {
      if (!userId) throw new Error('Sign in from Profile before sending a request.');
      // driverId is plain request data for now. The API does not verify it against a token yet.
      const result = await requestApi<{ request: RideRequest }>('/requests', {
        method: 'POST',
        body: JSON.stringify({
          driverId: userId,
          serviceType,
          vehicleDescription,
          problemDescription,
          locationLatitude: requestPlace.latitude,
          locationLongitude: requestPlace.longitude,
          locationAddress: requestPlace.address,
        }),
      });
      requestVersion.current += 1;
      setRequests((current) => [result.request, ...current]);
      setBids([]);
      return result.request;
    },
    [userId],
  );

  const cancelRequest = useCallback(async (id: string) => {
    const result = await requestApi<{ request: RideRequest }>(
      `/requests/${encodeURIComponent(id)}/cancel`,
      { method: 'POST' },
    );
    requestVersion.current += 1;
    setRequests((current) => current.map((item) => (item.id === id ? result.request : item)));
  }, []);

  const acceptBid = useCallback(
    async (bid: Bid) => {
      if (!userId) throw new Error('Sign in from Profile before accepting an offer.');
      const result = await requestApi<{ bid: Bid }>(`/bids/${encodeURIComponent(bid.id)}/accept`, {
        method: 'POST',
        body: JSON.stringify({ driverId: userId }),
      });
      requestVersion.current += 1;
      const now = new Date().toISOString();
      setBids((current) =>
        current.map((item) =>
          item.id === bid.id
            ? result.bid
            : item.status === 'Submitted'
              ? { ...item, status: 'Rejected', updatedAt: now }
              : item,
        ),
      );
      setRequests((current) =>
        current.map((item) =>
          item.id === bid.requestId
            ? { ...item, status: 'Booked', providerId: bid.providerId, updatedAt: now }
            : item,
        ),
      );
    },
    [userId],
  );

  const rejectBid = useCallback(
    async (bid: Bid) => {
      if (!userId) throw new Error('Sign in from Profile before declining an offer.');
      const result = await requestApi<{ bid: Bid }>(`/bids/${encodeURIComponent(bid.id)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ driverId: userId }),
      });
      requestVersion.current += 1;
      setBids((current) => current.map((item) => (item.id === bid.id ? result.bid : item)));
    },
    [userId],
  );

  const notifications = useMemo(
    () => buildNotifications(user, requests, bids),
    [user, requests, bids],
  );
  const isUnread = useCallback(
    (notification: DriverNotification) => notification.at > lastSeenAt,
    [lastSeenAt],
  );
  const unreadCount = useMemo(
    () => notifications.filter(isUnread).length,
    [notifications, isUnread],
  );

  const markNotificationsRead = useCallback(() => {
    const newest = notifications[0]?.at;
    if (!newest || newest <= lastSeenAt) return;
    setLastSeenAt(newest);
    AsyncStorage.setItem(seenKey, newest).catch(logStorageError);
  }, [lastSeenAt, notifications, seenKey]);

  const value: DriverData = {
    authConfigured: supabase !== null,
    user,
    displayName: user?.email?.split('@')[0] ?? 'there',
    requests,
    activeRequest: requests.find((request) => ACTIVE_STATUSES.has(request.status)) ?? null,
    bids,
    refreshError,
    vehicles,
    defaultVehicle: vehicles.find((vehicle) => vehicle.isDefault) ?? vehicles[0] ?? null,
    addVehicle,
    removeVehicle,
    setDefaultVehicle,
    place,
    setPlace,
    createRequest,
    cancelRequest,
    acceptBid,
    rejectBid,
    notifications,
    unreadCount,
    isUnread,
    markNotificationsRead,
  };

  return <DriverDataContext.Provider value={value}>{children}</DriverDataContext.Provider>;
}

export function useDriverData() {
  const value = useContext(DriverDataContext);
  if (!value) throw new Error('useDriverData must be used inside DriverDataProvider');
  return value;
}

export function formatLkr(value: number) {
  return `LKR ${value.toLocaleString('en-US')}`;
}

export function vehicleLabel(vehicle: Vehicle) {
  return `${vehicle.name} · ${vehicle.plate}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
