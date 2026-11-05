import { StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, spacing } from '@ridefix/ui-tokens';
import { Card, FlowScreen, Muted } from '../components/Screen';
import { IconTile, StatusPill } from '../components/parts';
import { formatDateTime, useDriverData } from '../lib/driver-data';
import type { RideRequest } from '../lib/request-api';
import { ui } from '../theme';

export function RequestRow({ request }: { request: RideRequest }) {
  return (
    <View style={styles.row}>
      <IconTile name="truck" size={46} />
      <View style={styles.text}>
        <Text style={styles.title}>{request.serviceType}</Text>
        <Muted>
          {[request.problemDescription, request.vehicleDescription].filter(Boolean).join(' • ')}
        </Muted>
        <Muted>{formatDateTime(request.createdAt)}</Muted>
      </View>
      <StatusPill status={request.status} />
    </View>
  );
}

export function RequestHistory({
  title,
  bookingsOnly,
  onBack,
}: {
  title: string;
  bookingsOnly?: boolean;
  onBack: () => void;
}) {
  const { requests } = useDriverData();
  const items = bookingsOnly ? requests.filter((request) => request.providerId) : requests;
  return (
    <FlowScreen title={title} onBack={onBack}>
      {items.length === 0 && <Muted>Nothing here yet.</Muted>}
      {items.map((request) => (
        <Card key={request.id}>
          <RequestRow request={request} />
        </Card>
      ))}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  text: { flex: 1, gap: 2 },
  title: { color: ui.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});
