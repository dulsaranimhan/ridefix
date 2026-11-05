import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { useDriverData, type Vehicle, type VehicleKind } from '../lib/driver-data';
import type { RequestStatus } from '../lib/request-api';
import { ui } from '../theme';
import { OutlineButton, PrimaryButton } from './PrimaryButton';
import { ErrorText } from './Screen';

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <Text style={[styles.logo, { fontSize: size }]}>
      Ride<Text style={{ color: ui.orange }}>Fix</Text>
    </Text>
  );
}

export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export function BellButton({ onPress }: { onPress: () => void }) {
  const { unreadCount } = useDriverData();
  return (
    <Pressable
      accessibilityLabel={`Notifications, ${unreadCount} unread`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.bell}
    >
      <Feather name="bell" size={20} color={ui.ink} />
      <Badge count={unreadCount} />
    </Pressable>
  );
}

export function IconTile({
  name,
  size = 44,
  color = ui.orange,
  background = ui.tint,
}: {
  name: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
  background?: string;
}) {
  return (
    <View
      style={[
        styles.iconTile,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: background },
      ]}
    >
      <Feather name={name} size={size * 0.48} color={color} />
    </View>
  );
}

export function ProviderAvatar({ size = 48 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Feather name="tool" size={size * 0.44} color={ui.orange} />
    </View>
  );
}

export function Rating({ rating, reviews }: { rating: number; reviews?: string }) {
  return (
    <View style={styles.rating}>
      <MaterialCommunityIcons name="star" size={15} color={ui.amber} />
      <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
      {!!reviews && <Text style={styles.ratingCount}>{reviews}</Text>}
    </View>
  );
}

export function Pill({ icon, label }: { icon?: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View style={styles.pill}>
      {icon && <Feather name={icon} size={13} color={ui.muted} />}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function SelectMark({ selected }: { selected: boolean }) {
  return selected ? (
    <View style={styles.markOn}>
      <Feather name="check" size={14} color="#FFFFFF" />
    </View>
  ) : (
    <View style={styles.markOff} />
  );
}

export function StatusPill({ status }: { status: RequestStatus }) {
  const tone =
    status === 'Completed'
      ? { bg: ui.greenTint, fg: ui.green }
      : status === 'Cancelled' || status === 'Expired'
        ? { bg: ui.soft, fg: ui.muted }
        : { bg: ui.tint, fg: ui.orangeDeep };
  return (
    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.statusPillText, { color: tone.fg }]}>
        {status === 'Open for bids' ? 'Requested' : status}
      </Text>
    </View>
  );
}

const KIND_ICON: Record<VehicleKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  car: 'car-side',
  suv: 'car-estate',
  motorbike: 'motorbike',
  van: 'van-passenger',
};

export function VehicleIcon({
  kind,
  size = 64,
  dark,
}: {
  kind: VehicleKind;
  size?: number;
  dark?: boolean;
}) {
  return (
    <View
      style={[
        styles.vehicleIcon,
        { width: size * 1.35, height: size },
        dark && { backgroundColor: ui.darkSoft },
      ]}
    >
      <MaterialCommunityIcons
        name={KIND_ICON[kind]}
        size={size * 0.68}
        color={dark ? '#FFFFFF' : ui.ink}
      />
    </View>
  );
}

const KINDS: { kind: VehicleKind; label: string }[] = [
  { kind: 'car', label: 'Car' },
  { kind: 'suv', label: 'SUV' },
  { kind: 'motorbike', label: 'Motorbike' },
  { kind: 'van', label: 'Van' },
];

/** Saves to this device only, because no backend owns vehicle data yet. */
export function VehicleForm({
  onSaved,
  onCancel,
}: {
  onSaved: (vehicle: Vehicle) => void;
  onCancel: () => void;
}) {
  const { addVehicle } = useDriverData();
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [kind, setKind] = useState<VehicleKind>('car');
  const [error, setError] = useState('');

  function save() {
    if (!name.trim() || !plate.trim()) {
      setError('Enter the vehicle name and number plate.');
      return;
    }
    onSaved(addVehicle({ name: name.trim(), plate: plate.trim().toUpperCase(), kind }));
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Add a vehicle</Text>
      <TextField
        label="Vehicle"
        placeholder="e.g. Toyota Camry 2007"
        value={name}
        onChangeText={setName}
      />
      <TextField
        label="Number plate"
        placeholder="e.g. WP-KL 1234"
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
      />
      <View style={styles.chipRow}>
        {KINDS.map((item) => (
          <FilterChip
            key={item.kind}
            label={item.label}
            selected={kind === item.kind}
            onPress={() => setKind(item.kind)}
          />
        ))}
      </View>
      {!!error && <ErrorText>{error}</ErrorText>}
      <PrimaryButton title="Save Vehicle" onPress={save} />
      <OutlineButton title="Cancel" onPress={onCancel} />
    </View>
  );
}

export function TextField({
  label,
  multiline,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'characters' | 'sentences';
  keyboardType?: 'default' | 'decimal-pad' | 'email-address' | 'numbers-and-punctuation';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={ui.muted}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Notifications: 'bell',
  Profile: 'user',
};

/** Dark rounded navigation bar from the design. */
export function DriverTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { unreadCount } = useDriverData();
  const insets = useSafeAreaInsets();
  const focused = state.routes[state.index];
  const tabBarStyle = focused ? descriptors[focused.key]?.options.tabBarStyle : undefined;
  if (StyleSheet.flatten(tabBarStyle)?.display === 'none') return null;

  return (
    <View style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={route.name}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tabItem}
            >
              <View style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
                {route.name === 'My Vehicles' ? (
                  <MaterialCommunityIcons name="car-side" size={20} color="#FFFFFF" />
                ) : (
                  <Feather name={TAB_ICONS[route.name] ?? 'circle'} size={18} color="#FFFFFF" />
                )}
                {route.name === 'Notifications' && <Badge count={unreadCount} />}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { color: ui.ink, fontWeight: fontWeight.bold },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: ui.orangeDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: fontWeight.semibold },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  avatar: { backgroundColor: ui.dark, alignItems: 'center', justifyContent: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingValue: { color: ui.amber, fontSize: fontSize.caption + 1, fontWeight: fontWeight.medium },
  ratingCount: { color: ui.muted, fontSize: fontSize.caption + 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ui.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: ui.ink, fontSize: fontSize.caption },
  chip: {
    backgroundColor: ui.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: { backgroundColor: ui.dark },
  chipText: { color: ui.ink, fontSize: fontSize.caption + 1 },
  chipTextSelected: { color: '#FFFFFF', fontWeight: fontWeight.semibold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  markOn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ui.orangeDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOff: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#C9CCD2' },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  vehicleIcon: {
    backgroundColor: ui.soft,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  formTitle: { color: ui.ink, fontSize: fontSize.subtitle, fontWeight: fontWeight.bold },
  field: { gap: spacing.xs },
  fieldLabel: { color: ui.ink, fontSize: fontSize.caption + 1, fontWeight: fontWeight.medium },
  input: {
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.md,
    padding: spacing.md,
    color: ui.ink,
    backgroundColor: ui.card,
    fontSize: fontSize.body,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  tabWrap: {
    backgroundColor: ui.background,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: ui.dark,
    borderRadius: 30,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabIcon: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: { backgroundColor: ui.orange },
  tabLabel: { color: '#D8DAE0', fontSize: 11 },
  tabLabelActive: { color: '#FFFFFF', fontWeight: fontWeight.bold },
});
