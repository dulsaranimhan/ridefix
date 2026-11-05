
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, fontSize, fontWeight } from '@ridefix/ui-tokens';
import { Card, Muted, Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { config } from '../config';
import { PrimaryButton } from '../components/PrimaryButton';

// API request timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

type ServiceRequest = {
  id: string;
  driverId: string;
  serviceType: string;
  description: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
};

async function getProviderId(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session) throw new Error('Please login again.');

  return session.user.id;
}

export function JobsScreen() {
  const [available, setAvailable] = useState(false);
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ServiceRequest | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [myBids, setMyBids] = useState<Array<{ requestId: string; status: string; price: string | number }>>([]);

  // Load nearby service requests
  const loadJobs = useCallback(async (providerId: string) => {
    const response = await fetchWithTimeout(
      `${config.matchingApiUrl}/matching/requests?providerId=${encodeURIComponent(providerId)}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? 'Could not load jobs');
    }

    setJobs(data.requests ?? []);
  }, []);

  const loadMyBids = useCallback(async (providerId: string) => {
    const response = await fetchWithTimeout(`${config.biddingApiUrl}/bids/provider/${providerId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'Could not load submitted bids');
    setMyBids(data.bids ?? []);
  }, []);

  const submitBid = async () => {
    if (!selectedJob) return;
    const price = Number(bidPrice);
    const minutes = Number(estimatedMinutes);
    if (!bidPrice.trim() || !Number.isFinite(price) || price <= 0) { Alert.alert('Invalid price', 'Enter a valid bid price.'); return; }
    if (!estimatedMinutes.trim() || !Number.isInteger(minutes) || minutes <= 0) { Alert.alert('Invalid time', 'Enter estimated time in minutes.'); return; }
    setSubmittingBid(true);
    try {
      const providerId = await getProviderId();
      const response = await fetchWithTimeout(`${config.biddingApiUrl}/bids`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: selectedJob.id, providerId, price, estimatedTimeMinutes: minutes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Bid submission failed');
      Alert.alert('Bid submitted', 'Your bid has been sent to the driver.');
      setSelectedJob(null); setBidPrice(''); setEstimatedMinutes('');
      await loadMyBids(providerId);
    } catch (error) { Alert.alert('Could not submit bid', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setSubmittingBid(false); }
  };

  // Load provider availability
  const loadAvailability = useCallback(async () => {
    try {
      const providerId = await getProviderId();

      const response = await fetchWithTimeout(
        `${config.apiBaseUrl}/providers/${providerId}/availability`,
      );

      if (response.status === 404) {
        setAvailable(false);
        setJobs([]);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? 'Could not load availability');
      }

      const isAvailable = data.provider?.is_available === true;

      setAvailable(isAvailable);

      if (isAvailable) {
        await loadJobs(providerId);
        await loadMyBids(providerId);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('[JobsScreen] Loading error:', error);

      setAvailable(false);
      setJobs([]);

      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'The server took too long to respond. Please check your connection.'
            : error.message
          : 'Could not load jobs. Please try again.';

      Alert.alert('Connection error', message);
    } finally {
      setLoading(false);
    }
  }, [loadJobs, loadMyBids]);

  // Load data when screen opens
  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Update provider availability
  const updateAvailability = async (value: boolean) => {
    if (saving) return;

    setSaving(true);

    try {
      const providerId = await getProviderId();

      const response = await fetchWithTimeout(
        `${config.apiBaseUrl}/providers/${providerId}/availability`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isAvailable: value,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? 'Availability update failed');
      }

      setAvailable(value);

      if (value) {
        await loadJobs(providerId);
        await loadMyBids(providerId);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('[JobsScreen] Availability update error:', error);

      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'The server took too long to respond. Please try again.'
            : error.message
          : 'Please try again.';

      Alert.alert('Update failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Jobs">
      <Card dark>
        <View style={styles.row}>
          <View style={styles.availabilityInfo}>
            <Text style={styles.panelTitle}>
              {loading
                ? 'Loading...'
                : available
                  ? 'Available for jobs'
                  : 'Offline'}
            </Text>

            <Muted>
              {available
                ? 'You can receive service requests'
                : 'Turn on to receive service requests'}
            </Muted>
          </View>

          {loading || saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={available}
              onValueChange={updateAvailability}
              trackColor={{
                true: colors.primary,
                false: colors.textMuted,
              }}
            />
          )}
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nearby Requests</Text>
        <Text style={styles.count}>{jobs.length} jobs</Text>
      </View>

      {!available ? (
        <Card>
          <Muted>
            You are offline. Turn on availability to see nearby service requests.
          </Muted>
        </Card>
      ) : jobs.length > 0 ? (
        <View style={styles.list}>
          {jobs.map((item) => (
            <Card key={item.id}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>{item.serviceType}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>

              <Text style={styles.description}>
                {item.description || 'No additional description'}
              </Text>

              <Muted>
                Location: {item.latitude}, {item.longitude}
              </Muted>

              <Muted>
                Created: {new Date(item.createdAt).toLocaleString()}
              </Muted>
              {myBids.some((bid) => bid.requestId === item.id) ? (
                <Text style={styles.bidStatus}>Bid submitted · {myBids.find((bid) => bid.requestId === item.id)?.status}</Text>
              ) : (
                <PrimaryButton title={selectedJob?.id === item.id ? 'Close bid form' : 'Place a Bid'} onPress={() => { setSelectedJob(selectedJob?.id === item.id ? null : item); setBidPrice(''); setEstimatedMinutes(''); }} />
              )}
              {selectedJob?.id === item.id && (
                <View style={styles.bidForm}>
                  <Text style={styles.formTitle}>Submit Your Bid</Text>
                  <Text style={styles.inputLabel}>Your Price (LKR)</Text>
                  <TextInput value={bidPrice} onChangeText={setBidPrice} keyboardType="decimal-pad" placeholder="Enter your price" style={styles.input} />
                  <Text style={styles.inputLabel}>Estimated Arrival Time (minutes)</Text>
                  <TextInput value={estimatedMinutes} onChangeText={setEstimatedMinutes} keyboardType="number-pad" placeholder="e.g. 20" style={styles.input} />
                  <PrimaryButton title={submittingBid ? 'Submitting...' : 'Submit Bid'} onPress={submitBid} disabled={submittingBid} />
                </View>
              )}
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Muted>
            No open service requests are available right now.
          </Muted>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  availabilityInfo: {
    flex: 1,
  },
  panelTitle: {
    color: colors.onPanel,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
  count: {
    color: colors.textMuted,
    fontSize: 12,
  },
  list: {
    paddingBottom: 20,
    gap: 10,
  },
  bidForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  formTitle: { color: colors.text, fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  inputLabel: { color: colors.text, fontSize: 13, fontWeight: fontWeight.semibold },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.background },
  bidStatus: { color: colors.primary, fontWeight: fontWeight.semibold, marginTop: 8 },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    color: colors.text,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
  status: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
  description: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 10,
  },
});
