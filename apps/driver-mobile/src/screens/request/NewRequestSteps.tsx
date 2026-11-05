import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { OutlineButton, PrimaryButton } from '../../components/PrimaryButton';
import { PrototypeMap } from '../../components/PrototypeMap';
import { ErrorText, FlowScreen, Muted } from '../../components/Screen';
import {
  BellButton,
  FilterChip,
  IconTile,
  Logo,
  SelectMark,
  TextField,
  VehicleForm,
  VehicleIcon,
} from '../../components/parts';
import { useDriverData, type Place, type Vehicle } from '../../lib/driver-data';
import { ui } from '../../theme';

export const SERVICES = [
  {
    name: 'Roadside Assistance',
    blurb: 'Get on-site help for vehicle issues',
    icon: 'tool',
  },
  { name: 'Book a Garage', blurb: 'Find and book nearest garages', icon: 'home' },
  { name: 'Towing Service', blurb: 'Tow your vehicle to nearest garage', icon: 'truck' },
  { name: 'Battery Service', blurb: 'Battery jump start or replacement', icon: 'battery-charging' },
] as const;

export type ServiceName = (typeof SERVICES)[number]['name'];

export const PROBLEMS = [
  'Engine Problem',
  'Flat Tyre',
  'Battery Problem',
  'Out of Fuel',
  'Locked Out',
  'Accident',
  'Other',
] as const;

export interface RequestDraft {
  service: ServiceName;
  vehicle: Vehicle | null;
  problem: string;
  notes: string;
  place: Place;
}

export function describeProblem(draft: RequestDraft) {
  const notes = draft.notes.trim();
  return notes ? `${draft.problem}: ${notes}` : draft.problem;
}

interface StepProps {
  draft: RequestDraft;
  update: (changes: Partial<RequestDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ServiceStep({
  draft,
  update,
  onBack,
  onNext,
  onNotifications,
}: StepProps & { onNotifications: () => void }) {
  const { place } = useDriverData();
  return (
    <FlowScreen
      onBack={onBack}
      footer={<PrimaryButton title="Continue" trailingArrow onPress={onNext} />}
    >
      <View style={styles.brandRow}>
        <View style={styles.brandText}>
          <Logo />
          <View style={styles.placeRow}>
            <Feather name="map-pin" size={14} color={ui.orange} />
            <Muted>{place.address}</Muted>
          </View>
        </View>
        <BellButton onPress={onNotifications} />
      </View>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          What do you need help with?
        </Text>
        <Muted>Choose a service to continue</Muted>
      </View>
      <View style={styles.grid}>
        {SERVICES.map((service) => {
          const selected = draft.service === service.name;
          return (
            <Pressable
              key={service.name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => update({ service: service.name })}
              style={[styles.serviceCard, selected && styles.selectedCard]}
            >
              <View style={styles.serviceTop}>
                <IconTile name={service.icon} size={50} />
                {selected && <SelectMark selected />}
              </View>
              <Text style={styles.cardTitle}>{service.name}</Text>
              <Muted>{service.blurb}</Muted>
            </Pressable>
          );
        })}
      </View>
    </FlowScreen>
  );
}

export function VehicleStep({ draft, update, onBack, onNext }: StepProps) {
  const { vehicles } = useDriverData();
  const [adding, setAdding] = useState(vehicles.length === 0);
  return (
    <FlowScreen
      title="Select Vehicle"
      subtitle="Choose the vehicle that needs assistance"
      onBack={onBack}
      footer={
        <PrimaryButton title="Continue" trailingArrow disabled={!draft.vehicle} onPress={onNext} />
      }
    >
      {vehicles.map((vehicle) => {
        const selected = draft.vehicle?.id === vehicle.id;
        return (
          <Pressable
            key={vehicle.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => update({ vehicle })}
            style={[styles.vehicleRow, selected && styles.selectedCard]}
          >
            <VehicleIcon kind={vehicle.kind} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{vehicle.name}</Text>
              <Muted>{vehicle.plate}</Muted>
            </View>
            <SelectMark selected={selected} />
          </Pressable>
        );
      })}
      {adding ? (
        <VehicleForm
          onSaved={(vehicle) => {
            update({ vehicle });
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <OutlineButton title="Add Vehicle" icon="plus" onPress={() => setAdding(true)} />
      )}
    </FlowScreen>
  );
}

export function ProblemStep({ draft, update, onBack, onNext }: StepProps) {
  return (
    <FlowScreen
      title="What Happened?"
      subtitle="Choose the problem and add any details"
      onBack={onBack}
      footer={
        <PrimaryButton title="Continue" trailingArrow disabled={!draft.problem} onPress={onNext} />
      }
    >
      <View style={styles.chips}>
        {PROBLEMS.map((problem) => (
          <FilterChip
            key={problem}
            label={problem}
            selected={draft.problem === problem}
            onPress={() => update({ problem })}
          />
        ))}
      </View>
      <TextField
        label="Notes"
        multiline
        placeholder="e.g. Car not starting, unusual noise"
        value={draft.notes}
        onChangeText={(notes) => update({ notes })}
      />
    </FlowScreen>
  );
}

export function LocationStep({ draft, update, onBack, onNext }: StepProps) {
  const { setPlace } = useDriverData();
  const [editing, setEditing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latitude, setLatitude] = useState(String(draft.place.latitude));
  const [longitude, setLongitude] = useState(String(draft.place.longitude));
  const [error, setError] = useState('');

  function applyPlace(place: Place) {
    update({ place });
    setPlace(place);
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location permission was not given. Type your location instead.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = position.coords;
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const [match] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const named = [match?.street, match?.city, match?.country].filter(Boolean).join(', ');
        if (named) address = named;
      } catch {
        // Street names are not available on every platform. Coordinates still work.
      }
      applyPlace({ address, latitude: lat, longitude: lng });
    } catch {
      setError('Could not get your location. Type your location instead.');
    } finally {
      setLocating(false);
    }
  }

  function goNext() {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!draft.place.address.trim()) {
      setError('Enter your location.');
      return;
    }
    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      setError('Enter valid map coordinates.');
      setEditing(true);
      return;
    }
    applyPlace({ address: draft.place.address.trim(), latitude: lat, longitude: lng });
    onNext();
  }

  return (
    <FlowScreen
      title="Your Location"
      subtitle="Use your current location or type where you are"
      onBack={onBack}
      footer={<PrimaryButton title="Continue" trailingArrow onPress={goNext} />}
    >
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Feather name="map-pin" size={18} color={ui.muted} />
          <TextInput
            accessibilityLabel="Location address"
            onChangeText={(address) => update({ place: { ...draft.place, address } })}
            placeholder="Address or nearby landmark"
            placeholderTextColor={ui.muted}
            style={styles.searchInput}
            value={draft.place.address}
          />
        </View>
        <Pressable
          accessibilityLabel="Use my current location"
          accessibilityRole="button"
          disabled={locating}
          onPress={() => void useCurrentLocation()}
          style={styles.locate}
        >
          <Feather name={locating ? 'loader' : 'crosshair'} size={20} color={ui.orange} />
        </Pressable>
      </View>
      <PrototypeMap height={280} label="You are here" note="Illustration, not a live map" />
      <View style={styles.placeCard}>
        <IconTile name="map-pin" size={44} />
        <View style={styles.flex}>
          <Text style={styles.cardTitleSmall}>Current Location</Text>
          <Muted>{draft.place.address || 'Not set'}</Muted>
          <Muted>
            {latitude}, {longitude}
          </Muted>
        </View>
        <EditButton label="Edit coordinates" onPress={() => setEditing(!editing)} />
      </View>
      {editing && (
        <View style={styles.coordinates}>
          <View style={styles.flex}>
            <TextField
              label="Latitude"
              keyboardType="numbers-and-punctuation"
              onChangeText={setLatitude}
              value={latitude}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Longitude"
              keyboardType="numbers-and-punctuation"
              onChangeText={setLongitude}
              value={longitude}
            />
          </View>
        </View>
      )}
      {!!error && <ErrorText>{error}</ErrorText>}
    </FlowScreen>
  );
}

function EditButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.edit}
    >
      <Text style={styles.editText}>Edit</Text>
    </Pressable>
  );
}

function ReviewRow({
  icon,
  label,
  title,
  detail,
  onEdit,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  title: string;
  detail?: string;
  onEdit: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.reviewRow, !last && styles.reviewLine]}>
      <IconTile name={icon} size={44} />
      <View style={styles.flex}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.cardTitleSmall}>{title}</Text>
        {!!detail && <Muted>{detail}</Muted>}
      </View>
      <EditButton label={`Edit ${label}`} onPress={onEdit} />
    </View>
  );
}

export function ReviewStep({
  draft,
  sending,
  error,
  onBack,
  onEdit,
  onSend,
}: {
  draft: RequestDraft;
  sending: boolean;
  error: string;
  onBack: () => void;
  onEdit: (step: 'service' | 'vehicle' | 'problem' | 'location') => void;
  onSend: () => void;
}) {
  return (
    <FlowScreen
      title="Review Request"
      subtitle="Please check the details before sending"
      onBack={onBack}
      footer={
        <PrimaryButton
          title={sending ? 'Sending…' : 'Send Request'}
          trailingArrow={!sending}
          disabled={sending}
          onPress={onSend}
        />
      }
    >
      <View style={styles.reviewCard}>
        <ReviewRow
          icon="tool"
          label="Service Type"
          title={draft.service}
          onEdit={() => onEdit('service')}
        />
        <ReviewRow
          icon="truck"
          label="Vehicle"
          title={draft.vehicle?.name ?? 'No vehicle selected'}
          detail={draft.vehicle?.plate}
          onEdit={() => onEdit('vehicle')}
        />
        <ReviewRow
          icon="alert-triangle"
          label="Problem"
          title={draft.problem}
          detail={draft.notes.trim() || undefined}
          onEdit={() => onEdit('problem')}
        />
        <ReviewRow
          icon="map-pin"
          label="Location"
          title={draft.place.address}
          onEdit={() => onEdit('location')}
          last
        />
      </View>
      <View style={styles.shield}>
        <Feather name="shield" size={18} color={ui.orange} />
        <View style={styles.flex}>
          <Muted>
            Providers will send you offers. You choose the best one. Photos are not connected yet.
          </Muted>
        </View>
      </View>
      {!!error && <ErrorText>{error}</ErrorText>}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandText: { gap: spacing.xs, flex: 1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heading: { gap: spacing.xs },
  title: { color: ui.ink, fontSize: 25, fontWeight: fontWeight.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  serviceCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg + 2,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 170,
  },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  selectedCard: { borderColor: ui.orange, borderWidth: 1.5, backgroundColor: '#FFF9F5' },
  cardTitle: { color: ui.ink, fontSize: fontSize.subtitle - 1, fontWeight: fontWeight.semibold },
  cardTitleSmall: { color: ui.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg + 2,
    padding: spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  searchRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: ui.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md, color: ui.ink, fontSize: fontSize.body },
  locate: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ui.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.line,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg + 2,
    padding: spacing.md,
  },
  coordinates: { flexDirection: 'row', gap: spacing.md },
  edit: {
    backgroundColor: ui.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: { color: ui.ink, fontSize: fontSize.caption + 1 },
  reviewCard: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg + 2,
    paddingHorizontal: spacing.md,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  reviewLine: { borderBottomWidth: 1, borderBottomColor: ui.line },
  reviewLabel: { color: ui.muted, fontSize: fontSize.caption },
  shield: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: ui.tint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
