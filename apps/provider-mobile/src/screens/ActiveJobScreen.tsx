import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '@ridefix/ui-tokens';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card, Muted, Screen } from '../components/Screen';
import { getProvider } from '../lib/provider-identity';
import { requestApi, type RideRequest, type RequestStatus } from '../lib/request-api';

export function ActiveJobScreen() {
  const [job, setJob] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  const loadJob = useCallback(async () => {
    try {
      const provider = await getProvider();
      const result = await requestApi<{ requests: RideRequest[] }>(
        `/requests/assigned?providerId=${encodeURIComponent(provider.id)}`,
      );
      // Newest first. An unfinished job comes before finished ones.
      setJob(
        result.requests.find((request) => request.status !== 'Completed') ??
          result.requests[0] ??
          null,
      );
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the active job.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJob();
    const timer = setInterval(() => void loadJob(), 4000);
    return () => clearInterval(timer);
  }, [loadJob]);

  const nextStatus: Partial<Record<RequestStatus, RequestStatus>> = {
    Booked: 'On the way',
    'On the way': 'In progress',
    'In progress': 'Completed',
  };

  async function advanceJob() {
    if (!job) return;
    const status = nextStatus[job.status];
    if (!status) return;
    setUpdating(true);
    setMessage('');
    try {
      const provider = await getProvider();
      const result = await requestApi<{ request: RideRequest }>(`/requests/${job.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ providerId: provider.id, status }),
      });
      setJob(result.request);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update this job.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Screen title="Active job">
      {loading && <ActivityIndicator color={colors.accent} />}
      {!loading && !job && (
        <Card>
          <Muted>Jobs appear here after a driver accepts your bid.</Muted>
        </Card>
      )}
      {job && (
        <>
          <Card dark>
            <Text style={styles.title}>{job.serviceType}</Text>
            <Text style={styles.darkBody}>
              {job.vehicleDescription || 'Vehicle details not provided'}
            </Text>
            <Text style={styles.darkBody}>{job.problemDescription}</Text>
            <Text style={styles.darkBody}>{job.locationAddress || 'Location not provided'}</Text>
          </Card>
          <Card>
            <Text style={styles.status}>
              {job.status === 'Completed' ? 'Service completed' : job.status}
            </Text>
            <Muted>Driver ID: {job.driverId.slice(0, 8)}</Muted>
            {job.status === 'Completed' ? (
              <Card dark>
                <Text style={styles.darkTitle}>Payment by cash</Text>
                <Text style={styles.darkBody}>
                  Collect payment directly from the driver. In-app payment is not connected.
                </Text>
              </Card>
            ) : (
              <PrimaryButton
                title={
                  updating
                    ? 'Updating…'
                    : job.status === 'Booked'
                      ? 'I’m on the way'
                      : job.status === 'On the way'
                        ? 'Start work'
                        : 'Mark job complete'
                }
                onPress={() => void advanceJob()}
                disabled={updating}
              />
            )}
          </Card>
        </>
      )}
      {message ? (
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.onPanel, fontSize: fontSize.subtitle, fontWeight: fontWeight.bold },
  darkTitle: { color: colors.onPanel, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  darkBody: { color: colors.onPanel, opacity: 0.85, fontSize: fontSize.body },
  status: { color: colors.accent, fontSize: fontSize.subtitle, fontWeight: fontWeight.bold },
  message: { color: colors.danger, fontSize: fontSize.body, marginTop: spacing.sm },
});
