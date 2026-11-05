import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { colors, fontSize, fontWeight } from '@ridefix/ui-tokens';
import { Card, Muted, Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { getProvider } from '../lib/provider-identity';
import { requestApi, type Bid, type RideRequest } from '../lib/request-api';

const REFRESH_MS = 4000;

interface Availability {
  providerId: string;
  isAvailable: boolean;
  updatedAt: string | null;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function JobsScreen() {
  const [available, setAvailable] = useState(false);
  const [jobs, setJobs] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedJob, setSelectedJob] = useState<RideRequest | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [message, setMessage] = useState('');

  const loadJobsAndBids = useCallback(async () => {
    const provider = await getProvider();
    const [jobResult, bidResult] = await Promise.all([
      requestApi<{ requests: RideRequest[] }>('/requests/open'),
      requestApi<{ bids: Bid[] }>(`/bids?providerId=${encodeURIComponent(provider.id)}`),
    ]);
    setJobs(jobResult.requests);
    setMyBids(bidResult.bids);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const provider = await getProvider();
        const result = await requestApi<{ availability: Availability }>(
          `/matching/providers/${encodeURIComponent(provider.id)}/availability`,
        );
        if (active) setAvailable(result.availability.isAvailable);
      } catch (error) {
        if (active) setMessage(errorText(error, 'Could not load availability.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // New requests appear without pulling to refresh while the provider is available.
  useEffect(() => {
    if (!available) {
      setJobs([]);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        await loadJobsAndBids();
      } catch (error) {
        if (active) setMessage(errorText(error, 'Could not load jobs.'));
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [available, loadJobsAndBids]);

  const updateAvailability = async (value: boolean) => {
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      const provider = await getProvider();
      const result = await requestApi<{ availability: Availability }>(
        `/matching/providers/${encodeURIComponent(provider.id)}/availability`,
        { method: 'PUT', body: JSON.stringify({ isAvailable: value }) },
      );
      setAvailable(result.availability.isAvailable);
    } catch (error) {
      setMessage(errorText(error, 'Availability update failed.'));
    } finally {
      setSaving(false);
    }
  };

  const submitBid = async () => {
    if (!selectedJob) return;
    const price = Number(bidPrice);
    const minutes = Number(estimatedMinutes);
    if (!Number.isInteger(price) || price <= 0) {
      setMessage('Enter the price in whole rupees.');
      return;
    }
    if (!Number.isInteger(minutes) || minutes <= 0) {
      setMessage('Enter the arrival time in whole minutes.');
      return;
    }
    setSubmittingBid(true);
    setMessage('');
    try {
      const provider = await getProvider();
      await requestApi<{ bid: Bid }>('/bids', {
        method: 'POST',
        body: JSON.stringify({
          requestId: selectedJob.id,
          providerId: provider.id,
          providerName: provider.name,
          priceLkr: price,
          etaMinutes: minutes,
        }),
      });
      setSelectedJob(null);
      setBidPrice('');
      setEstimatedMinutes('');
      setMessage('Your bid has been sent to the driver.');
      await loadJobsAndBids();
    } catch (error) {
      setMessage(errorText(error, 'Bid submission failed.'));
    } finally {
      setSubmittingBid(false);
    }
  };

  const withdrawBid = async (bid: Bid) => {
    setMessage('');
    try {
      const provider = await getProvider();
      await requestApi<{ bid: Bid }>(`/bids/${bid.id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ providerId: provider.id }),
      });
      await loadJobsAndBids();
    } catch (error) {
      setMessage(errorText(error, 'Could not withdraw this bid.'));
    }
  };

  return (
    <Screen title="Jobs">
      {!!message && (
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
      )}
      <Card dark>
        <View style={styles.row}>
          <View style={styles.availabilityInfo}>
            <Text style={styles.panelTitle}>
              {loading ? 'Loading...' : available ? 'Available for jobs' : 'Offline'}
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
              onValueChange={(value) => void updateAvailability(value)}
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
          <Muted>You are offline. Turn on availability to see nearby service requests.</Muted>
        </Card>
      ) : jobs.length > 0 ? (
        <View style={styles.list}>
          {jobs.map((item) => {
            const openBid = myBids.find(
              (bid) => bid.requestId === item.id && bid.status === 'Submitted',
            );
            return (
              <Card key={item.id}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{item.serviceType}</Text>
                  <Text style={styles.status}>{item.status}</Text>
                </View>

                <Text style={styles.description}>{item.problemDescription}</Text>

                {!!item.vehicleDescription && <Muted>Vehicle: {item.vehicleDescription}</Muted>}
                <Muted>
                  Location:{' '}
                  {item.locationAddress ?? `${item.locationLatitude}, ${item.locationLongitude}`}
                </Muted>
                <Muted>Created: {new Date(item.createdAt).toLocaleString()}</Muted>

                {openBid ? (
                  <>
                    <Text style={styles.bidStatus}>
                      Bid sent · LKR {openBid.priceLkr.toLocaleString('en-US')} ·{' '}
                      {openBid.etaMinutes} min
                    </Text>
                    <PrimaryButton title="Withdraw Bid" onPress={() => void withdrawBid(openBid)} />
                  </>
                ) : (
                  <PrimaryButton
                    title={selectedJob?.id === item.id ? 'Close bid form' : 'Place a Bid'}
                    onPress={() => {
                      setSelectedJob(selectedJob?.id === item.id ? null : item);
                      setBidPrice('');
                      setEstimatedMinutes('');
                    }}
                  />
                )}
                {selectedJob?.id === item.id && !openBid && (
                  <View style={styles.bidForm}>
                    <Text style={styles.formTitle}>Submit Your Bid</Text>
                    <Text style={styles.inputLabel}>Your Price (LKR)</Text>
                    <TextInput
                      accessibilityLabel="Your price in LKR"
                      value={bidPrice}
                      onChangeText={setBidPrice}
                      keyboardType="number-pad"
                      placeholder="Enter your price"
                      style={styles.input}
                    />
                    <Text style={styles.inputLabel}>Estimated Arrival Time (minutes)</Text>
                    <TextInput
                      accessibilityLabel="Estimated arrival time in minutes"
                      value={estimatedMinutes}
                      onChangeText={setEstimatedMinutes}
                      keyboardType="number-pad"
                      placeholder="Enter minutes"
                      style={styles.input}
                    />
                    <PrimaryButton
                      title={submittingBid ? 'Submitting...' : 'Submit Bid'}
                      onPress={() => void submitBid()}
                      disabled={submittingBid}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      ) : (
        <Card>
          <Muted>No open service requests are available right now.</Muted>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { color: colors.text, fontSize: 14 },
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
  bidForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  formTitle: { color: colors.text, fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  inputLabel: { color: colors.text, fontSize: 13, fontWeight: fontWeight.semibold },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.background,
  },
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
