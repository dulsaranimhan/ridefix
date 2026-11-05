import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { OutlineButton, PrimaryButton } from '../../components/PrimaryButton';
import { PrototypeMap } from '../../components/PrototypeMap';
import { ErrorText, FlowScreen, Muted } from '../../components/Screen';
import { ProviderAvatar, Rating } from '../../components/parts';
import { formatDateTime, formatTime } from '../../lib/driver-data';
import { ui } from '../../theme';

/** Name, price and ETA come from the accepted bid. Ratings need a provider profile owner. */
export interface ProviderCardInfo {
  name: string;
  detail?: string;
  rating?: number;
  reviews?: number;
  etaMinutes?: number;
  priceLabel?: string;
}

function ProviderCard({
  provider,
  children,
}: {
  provider: ProviderCardInfo;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.providerRow}>
        <ProviderAvatar />
        <View style={styles.flex}>
          <Text style={styles.providerName}>{provider.name}</Text>
          {provider.rating !== undefined && (
            <Rating rating={provider.rating} reviews={`(${provider.reviews ?? 0} reviews)`} />
          )}
          {!!provider.detail && <Muted>{provider.detail}</Muted>}
        </View>
      </View>
      {children}
    </View>
  );
}

function SuccessMark() {
  return (
    <View style={styles.successOuter}>
      <View style={styles.successInner}>
        <Feather name="check" size={34} color="#FFFFFF" />
      </View>
    </View>
  );
}

export function FindingProviders({
  offerCount,
  onBack,
  onCancel,
  onViewOffers,
}: {
  offerCount: number;
  onBack: () => void;
  onCancel: () => Promise<void>;
  onViewOffers: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setCancelling(true);
    setError('');
    try {
      await onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel your request.');
      setCancelling(false);
    }
  }

  const steps = [
    { label: 'Request saved', done: true },
    { label: 'Visible to providers', done: true },
    {
      label:
        offerCount > 0
          ? `${offerCount} ${offerCount === 1 ? 'offer' : 'offers'} received`
          : 'Waiting for offers…',
      done: offerCount > 0,
    },
  ];

  return (
    <FlowScreen
      title="Finding Providers"
      subtitle="We are connecting you with service providers"
      onBack={onBack}
      footer={
        <>
          {offerCount > 0 && (
            <PrimaryButton
              title={`View ${offerCount === 1 ? 'Offer' : `${offerCount} Offers`}`}
              trailingArrow
              onPress={onViewOffers}
            />
          )}
          <OutlineButton
            title={cancelling ? 'Cancelling…' : 'Cancel Request'}
            danger
            disabled={cancelling}
            onPress={() => void cancel()}
          />
        </>
      }
    >
      <View style={styles.radar}>
        <View style={styles.ringOuter}>
          <View style={styles.ringMiddle}>
            <View style={styles.ringInner}>
              <View style={styles.radarCenter}>
                <Feather name="truck" size={26} color={ui.orange} />
              </View>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.searchSteps}>
        {steps.map((step) => (
          <View key={step.label} style={styles.stepRow}>
            <View style={step.done ? styles.dotDone : styles.dotOpen}>
              {step.done && <Feather name="check" size={13} color="#FFFFFF" />}
            </View>
            <Text style={step.done ? styles.stepText : styles.stepWaiting}>{step.label}</Text>
          </View>
        ))}
      </View>
      {!!error && <ErrorText>{error}</ErrorText>}
    </FlowScreen>
  );
}

export function ProviderConfirmed({
  provider,
  onBack,
  onTrack,
}: {
  provider: ProviderCardInfo;
  onBack: () => void;
  onTrack: () => void;
}) {
  const [notice, setNotice] = useState('');
  const actions = [
    { icon: 'phone', label: 'Call' },
    { icon: 'message-circle', label: 'Message' },
    { icon: 'user', label: 'View Profile' },
  ] as const;
  return (
    <FlowScreen
      onBack={onBack}
      footer={<OutlineButton title="View Live Location" onPress={onTrack} />}
    >
      <View style={styles.centerBlock}>
        <SuccessMark />
        <Text accessibilityRole="header" style={styles.centerTitle}>
          Provider Confirmed
        </Text>
        <Muted>{provider.name} has accepted your request.</Muted>
      </View>
      <ProviderCard provider={provider}>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Text
              key={action.label}
              accessibilityRole="button"
              onPress={() => setNotice(`${action.label} is not connected yet.`)}
              style={styles.action}
            >
              <Feather name={action.icon} size={18} color={ui.orange} />
              {`\n${action.label}`}
            </Text>
          ))}
        </View>
        {!!notice && <Muted>{notice}</Muted>}
      </ProviderCard>
      <View style={[styles.card, styles.providerRow]}>
        <View style={styles.softIcon}>
          <Feather name="navigation" size={18} color={ui.orange} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.providerName}>Waiting for the provider to start</Text>
          {provider.etaMinutes !== undefined && <Muted>ETA: {provider.etaMinutes} minutes</Muted>}
        </View>
      </View>
    </FlowScreen>
  );
}

const TRACK_STEPS = ['Booked', 'On the way', 'In progress', 'Completed'] as const;
export type TrackStatus = (typeof TRACK_STEPS)[number];

export function LiveTracking({
  provider,
  status,
  onBack,
  footer,
}: {
  provider: ProviderCardInfo;
  status: TrackStatus;
  onBack: () => void;
  footer?: React.ReactNode;
}) {
  const current = TRACK_STEPS.indexOf(status);
  return (
    <FlowScreen
      title="Live Tracking"
      subtitle={status === 'On the way' ? 'Your provider is on the way' : `Status: ${status}`}
      onBack={onBack}
      footer={footer}
    >
      <PrototypeMap
        height={300}
        mode="route"
        note="Prototype map · mock tracking"
        label={provider.etaMinutes !== undefined ? `${provider.etaMinutes} min ETA` : undefined}
      />
      <ProviderCard provider={provider} />
      <View style={styles.track}>
        {TRACK_STEPS.map((step, index) => (
          <View key={step} style={styles.trackItem}>
            <View style={[styles.trackDot, index <= current && styles.trackDotOn]} />
            <Text style={[styles.trackLabel, index === current && styles.trackLabelOn]}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </FlowScreen>
  );
}

export function ServiceInProgress({
  provider,
  updatedAt,
  onBack,
  footer,
}: {
  provider: ProviderCardInfo;
  updatedAt?: string;
  onBack: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <FlowScreen
      title="Service In Progress"
      subtitle="Your provider is working on your vehicle."
      onBack={onBack}
      footer={footer}
    >
      <View style={styles.photo}>
        <Feather name="tool" size={54} color={ui.darkSoft} />
        <View style={styles.photoTag}>
          <Text style={styles.photoTagText}>Photo placeholder</Text>
        </View>
      </View>
      <ProviderCard provider={provider} />
      <View style={styles.card}>
        <TimelineRow label="Provider on the way" state="done" />
        <TimelineRow
          label="Service In Progress"
          state="current"
          time={updatedAt ? formatTime(updatedAt) : undefined}
        />
        <TimelineRow label="Completed" state="open" last />
      </View>
    </FlowScreen>
  );
}

function TimelineRow({
  label,
  state,
  time,
  last,
}: {
  label: string;
  state: 'done' | 'current' | 'open';
  time?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.timeline, !last && styles.timelineLine]}>
      <View
        style={
          state === 'done'
            ? styles.timelineDone
            : state === 'current'
              ? styles.timelineCurrent
              : styles.dotOpen
        }
      >
        {state === 'done' && <Feather name="check" size={13} color="#FFFFFF" />}
      </View>
      <Text style={[styles.flexText, state === 'current' && styles.timelineStrong]}>{label}</Text>
      {!!time && <Text style={styles.detailLabel}>{time}</Text>}
    </View>
  );
}

export function ServiceCompleted({
  priceLabel,
  completedAt,
  onDone,
}: {
  priceLabel?: string;
  completedAt: string;
  onDone: () => void;
}) {
  const [notice, setNotice] = useState('');
  return (
    <FlowScreen
      onBack={onDone}
      footer={
        <>
          {!!notice && <Muted>{notice}</Muted>}
          <OutlineButton
            title="Payment & Receipt"
            onPress={() =>
              setNotice('Receipts are not connected yet. Please pay the provider in cash.')
            }
          />
          <PrimaryButton
            title="Rate & Review"
            onPress={() => setNotice('Ratings and reviews are not connected yet.')}
          />
        </>
      }
    >
      <View style={styles.centerBlock}>
        <SuccessMark />
        <Text accessibilityRole="header" style={styles.centerTitle}>
          Service Completed
        </Text>
        <Muted>Your vehicle is ready to go!</Muted>
      </View>
      <View style={styles.card}>
        <DetailRow label="Final Amount" value={priceLabel ?? 'Agree with your provider'} />
        <DetailRow label="Payment Method" value="Cash" />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Status</Text>
          <View style={styles.pending}>
            <Text style={styles.pendingText}>Pending confirmation</Text>
          </View>
        </View>
        <DetailRow label="Date & Time" value={formatDateTime(completedAt)} last />
      </View>
      <View style={styles.centerNote}>
        <Muted>Online payment is not connected. Please pay the provider directly.</Muted>
      </View>
    </FlowScreen>
  );
}

export function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailLine]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  flexText: { flex: 1, color: ui.muted, fontSize: fontSize.body },
  card: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg + 2,
    padding: spacing.lg,
    gap: spacing.md,
  },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  providerName: { color: ui.ink, fontSize: fontSize.body + 1, fontWeight: fontWeight.semibold },
  successOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: ui.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ui.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  centerTitle: { color: ui.ink, fontSize: 26, fontWeight: fontWeight.bold, marginTop: spacing.sm },
  centerNote: { alignItems: 'center' },
  radar: { alignItems: 'center', paddingVertical: spacing.lg },
  ringOuter: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FDF6F1',
    borderWidth: 1,
    borderColor: '#F7DDCF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringMiddle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FBEBE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F7DCCD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ui.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSteps: { gap: spacing.md, paddingHorizontal: spacing.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dotDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ui.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOpen: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#C9CCD2' },
  stepText: { color: ui.ink, fontSize: fontSize.body },
  stepWaiting: { color: ui.muted, fontSize: fontSize.body },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    color: ui.ink,
    fontSize: fontSize.caption,
    lineHeight: 22,
  },
  softIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm },
  trackItem: { flex: 1, alignItems: 'center', gap: spacing.sm },
  trackDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C9CCD2',
    backgroundColor: ui.card,
  },
  trackDotOn: { backgroundColor: ui.orange, borderColor: ui.orange },
  trackLabel: { color: ui.muted, fontSize: fontSize.caption },
  trackLabelOn: { color: ui.ink, fontWeight: fontWeight.semibold },
  photo: {
    height: 190,
    borderRadius: radius.lg + 2,
    backgroundColor: ui.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTag: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoTagText: { color: ui.muted, fontSize: 11 },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  timelineLine: { borderBottomWidth: 1, borderBottomColor: ui.line },
  timelineDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ui.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCurrent: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ui.orange,
    borderWidth: 4,
    borderColor: ui.tint,
  },
  timelineStrong: { color: ui.ink, fontWeight: fontWeight.semibold },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  detailLine: { borderBottomWidth: 1, borderBottomColor: ui.line },
  detailLabel: { color: ui.muted, fontSize: fontSize.body - 1 },
  detailValue: {
    color: ui.ink,
    fontSize: fontSize.body - 1,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
    textAlign: 'right',
  },
  pending: {
    backgroundColor: ui.amberTint,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingText: { color: '#8A5A12', fontSize: fontSize.caption, fontWeight: fontWeight.medium },
});
