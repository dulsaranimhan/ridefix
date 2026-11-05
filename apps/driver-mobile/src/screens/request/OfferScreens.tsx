import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { OutlineButton, PrimaryButton } from '../../components/PrimaryButton';
import { ErrorText, FlowScreen, Muted } from '../../components/Screen';
import { FilterChip, Pill, ProviderAvatar } from '../../components/parts';
import { formatLkr } from '../../lib/driver-data';
import type { Bid } from '../../lib/request-api';
import { ui } from '../../theme';
import { DetailRow } from './StatusScreens';

const FILTERS = ['All', 'Nearby', 'Best Price', 'Fastest'] as const;

function sortBids(bids: Bid[], filter: (typeof FILTERS)[number]) {
  const sorted = [...bids];
  if (filter === 'Nearby') {
    sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  if (filter === 'Best Price') sorted.sort((a, b) => a.priceLkr - b.priceLkr);
  if (filter === 'Fastest') sorted.sort((a, b) => a.etaMinutes - b.etaMinutes);
  return sorted;
}

/** Lower is better: price and arrival time weigh the same, each scaled against the other bids. */
function bestValueOrder(bids: Bid[]) {
  const maxPrice = Math.max(...bids.map((bid) => bid.priceLkr));
  const maxEta = Math.max(...bids.map((bid) => bid.etaMinutes));
  const score = (bid: Bid) => bid.priceLkr / maxPrice + bid.etaMinutes / maxEta;
  return [...bids].sort((a, b) => score(a) - score(b));
}

function secondsLeft(bids: Bid[]) {
  if (bids.length === 0) return 0;
  const earliest = Math.min(...bids.map((bid) => new Date(bid.expiresAt).getTime()));
  return Math.max(0, Math.round((earliest - Date.now()) / 1000));
}

export function OffersReceived({
  bids,
  onBack,
  onView,
  onCompare,
}: {
  bids: Bid[];
  onBack: () => void;
  onView: (bid: Bid) => void;
  onCompare: () => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [seconds, setSeconds] = useState(() => secondsLeft(bids));

  useEffect(() => {
    setSeconds(secondsLeft(bids));
    const timer = setInterval(() => setSeconds(secondsLeft(bids)), 1000);
    return () => clearInterval(timer);
  }, [bids]);

  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <FlowScreen
      title="Offers Received"
      subtitle={
        bids.length > 0
          ? `You have ${bids.length} ${bids.length === 1 ? 'offer' : 'offers'}. Choose the best one.`
          : 'No open offers right now. New offers appear here.'
      }
      onBack={onBack}
      headerRight={
        bids.length > 0 ? (
          <View accessibilityLabel={`Next offer expires in ${timerLabel}`} style={styles.timer}>
            <Feather name="clock" size={14} color={ui.orangeDeep} />
            <Text style={styles.timerText}>{timerLabel}</Text>
          </View>
        ) : undefined
      }
      footer={
        bids.length > 1 ? <OutlineButton title="Compare Offers" onPress={onCompare} /> : undefined
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <FilterChip
              key={item}
              label={item === 'All' ? `All (${bids.length})` : item}
              selected={filter === item}
              onPress={() => setFilter(item)}
            />
          ))}
        </View>
      </ScrollView>
      {sortBids(bids, filter).map((bid) => (
        <View key={bid.id} style={styles.card}>
          <View style={styles.offerTop}>
            <ProviderAvatar size={50} />
            <View style={styles.flex}>
              <Text style={styles.provider}>{bid.providerName}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{formatLkr(bid.priceLkr)}</Text>
              <Text style={styles.small}>Quoted price</Text>
            </View>
          </View>
          <View style={styles.offerBottom}>
            <Pill icon="clock" label={`${bid.etaMinutes} min`} />
            {bid.distanceKm !== null && <Pill icon="map-pin" label={`${bid.distanceKm} km`} />}
            <View style={styles.flex} />
            <Pressable
              accessibilityLabel={`View ${bid.providerName}`}
              accessibilityRole="button"
              onPress={() => onView(bid)}
              style={styles.view}
            >
              <Text style={styles.viewText}>View</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </FlowScreen>
  );
}

export function CompareOffers({
  bids,
  onBack,
  onSelect,
}: {
  bids: Bid[];
  onBack: () => void;
  onSelect: (bid: Bid) => void;
}) {
  const ranked = bestValueOrder(bids).slice(0, 3);
  return (
    <FlowScreen
      title="Compare Offers"
      subtitle="Compare providers and choose the best offer"
      onBack={onBack}
    >
      <View style={styles.compare}>
        {ranked.map((bid, index) => {
          const best = index === 0 && ranked.length > 1;
          return (
            <View key={bid.id} style={[styles.compareCard, best && styles.bestCard]}>
              {best && (
                <View style={styles.bestTag}>
                  <Text style={styles.bestTagText}>Best Value</Text>
                </View>
              )}
              <ProviderAvatar size={42} />
              <Text style={styles.compareName}>{bid.providerName}</Text>
              <Text style={styles.comparePrice}>{formatLkr(bid.priceLkr)}</Text>
              <View style={styles.compareLine} />
              <Metric icon="clock" value={`${bid.etaMinutes} min`} label="ETA" />
              <Metric
                icon="map-pin"
                value={bid.distanceKm !== null ? `${bid.distanceKm} km` : 'Not given'}
                label="Distance"
              />
              <View style={styles.compareSpacer} />
              {best ? (
                <PrimaryButton title="Select" onPress={() => onSelect(bid)} />
              ) : (
                <OutlineButton title="Select" onPress={() => onSelect(bid)} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.noteBox}>
        <Feather name="shield" size={16} color={ui.muted} />
        <View style={styles.flex}>
          <Muted>Best Value weighs price and arrival time together, not price alone.</Muted>
        </View>
      </View>
    </FlowScreen>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValue}>
        <Feather name={icon} size={13} color={ui.orange} />
        <Text style={styles.metricText}>{value}</Text>
      </View>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

export function OfferDetail({
  bid,
  busy,
  error,
  onBack,
  onAccept,
  onDecline,
}: {
  bid: Bid;
  busy: boolean;
  error: string;
  onBack: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <FlowScreen
      onBack={onBack}
      footer={
        <>
          <OutlineButton title="Decline" danger disabled={busy} onPress={onDecline} />
          <PrimaryButton title="Accept Offer" trailingArrow disabled={busy} onPress={onAccept} />
        </>
      }
    >
      <View style={styles.detailHeader}>
        <ProviderAvatar size={60} />
        <View style={styles.flex}>
          <Text style={styles.detailName}>{bid.providerName}</Text>
        </View>
      </View>
      <Text style={styles.detailPrice}>{formatLkr(bid.priceLkr)}</Text>
      <View style={styles.pills}>
        <Pill icon="clock" label={`${bid.etaMinutes} min away`} />
        {bid.distanceKm !== null && <Pill icon="map-pin" label={`${bid.distanceKm} km`} />}
      </View>
      {!!bid.note && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this offer</Text>
          <Muted>{bid.note}</Muted>
        </View>
      )}
      {!!error && <ErrorText>{error}</ErrorText>}
    </FlowScreen>
  );
}

export function ConfirmProvider({
  bid,
  busy,
  error,
  onBack,
  onConfirm,
}: {
  bid: Bid;
  busy: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <FlowScreen
      title="Confirm Provider"
      subtitle="You are about to accept this offer"
      onBack={onBack}
      footer={
        <PrimaryButton
          title={busy ? 'Accepting…' : 'Confirm & Accept'}
          disabled={busy}
          onPress={onConfirm}
        />
      }
    >
      <View style={[styles.card, styles.confirmProvider]}>
        <ProviderAvatar />
        <View style={styles.flex}>
          <Text style={styles.provider}>{bid.providerName}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <DetailRow label="Service Charge" value={formatLkr(bid.priceLkr)} />
        <DetailRow label="Estimated Arrival" value={`${bid.etaMinutes} minutes`} />
        {bid.distanceKm !== null && <DetailRow label="Distance" value={`${bid.distanceKm} km`} />}
        <DetailRow label="Payment Method" value="Cash" last />
      </View>
      <Muted>Online payment is not connected. Please pay the provider directly.</Muted>
      {!!error && <ErrorText>{error}</ErrorText>}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ui.tint,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timerText: { color: ui.orangeDeep, fontSize: fontSize.body - 1, fontWeight: fontWeight.semibold },
  filterScroll: { flexGrow: 0 },
  filters: { flexDirection: 'row', gap: spacing.sm },
  card: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg + 2,
    padding: spacing.lg,
    gap: spacing.md,
  },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  offerBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  provider: { color: ui.ink, fontSize: fontSize.body + 1, fontWeight: fontWeight.semibold },
  priceBlock: { alignItems: 'flex-end', gap: 2 },
  price: { color: ui.ink, fontSize: fontSize.body + 1, fontWeight: fontWeight.bold },
  small: { color: ui.muted, fontSize: fontSize.caption },
  view: {
    backgroundColor: ui.orange,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  viewText: { color: '#FFFFFF', fontSize: fontSize.body - 1, fontWeight: fontWeight.semibold },
  compare: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  compareCard: {
    flex: 1,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs + 2,
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  bestCard: { borderColor: ui.orange, borderWidth: 1.5, backgroundColor: '#FFF9F5' },
  bestTag: {
    position: 'absolute',
    top: -11,
    backgroundColor: ui.orange,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  bestTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: fontWeight.semibold },
  compareName: {
    color: ui.ink,
    fontSize: fontSize.caption + 1,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    minHeight: 34,
  },
  comparePrice: { color: ui.ink, fontSize: fontSize.body - 1, fontWeight: fontWeight.bold },
  compareLine: { height: 1, alignSelf: 'stretch', backgroundColor: ui.line },
  compareSpacer: { flexGrow: 1, minHeight: spacing.sm },
  metric: { alignItems: 'center', gap: 2 },
  metricValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { color: ui.ink, fontSize: fontSize.caption + 1, fontWeight: fontWeight.semibold },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: ui.soft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailName: { color: ui.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold },
  detailPrice: { color: ui.ink, fontSize: 30, fontWeight: fontWeight.bold },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: { color: ui.ink, fontSize: fontSize.body + 1, fontWeight: fontWeight.semibold },
  confirmProvider: { flexDirection: 'row', alignItems: 'center' },
});
