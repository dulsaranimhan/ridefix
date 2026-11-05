import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { PrimaryButton } from '../components/PrimaryButton';
import { Muted, PageTitle, RoundButton, Screen } from '../components/Screen';
import { SelectMark, VehicleForm, VehicleIcon } from '../components/parts';
import { useDriverData } from '../lib/driver-data';
import { ui } from '../theme';

export function VehiclesScreen() {
  const { vehicles, setDefaultVehicle, removeVehicle } = useDriverData();
  const [adding, setAdding] = useState(false);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <PageTitle title="My Vehicles" subtitle="Manage your vehicles for quick assistance." />
        </View>
        <RoundButton icon="plus" label="Add vehicle" onPress={() => setAdding(true)} />
      </View>

      {vehicles.length === 0 && !adding && (
        <View style={styles.empty}>
          <Muted>You have not added a vehicle yet.</Muted>
        </View>
      )}

      {vehicles.map((vehicle) => (
        <View key={vehicle.id} style={[styles.vehicle, vehicle.isDefault && styles.vehicleDefault]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Make ${vehicle.name} the default vehicle`}
            accessibilityState={{ selected: vehicle.isDefault }}
            onPress={() => setDefaultVehicle(vehicle.id)}
            style={styles.vehicleMain}
          >
            <VehicleIcon kind={vehicle.kind} />
            <View style={styles.vehicleText}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Muted>{vehicle.plate}</Muted>
              {vehicle.isDefault && (
                <View style={styles.defaultTag}>
                  <Text style={styles.defaultTagText}>Default</Text>
                </View>
              )}
            </View>
            {!vehicle.isDefault && <SelectMark selected={false} />}
          </Pressable>
          {vehicle.isDefault && (
            <Pressable
              accessibilityLabel={`Remove ${vehicle.name}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => removeVehicle(vehicle.id)}
              style={styles.remove}
            >
              <Feather name="trash-2" size={16} color={ui.ink} />
            </Pressable>
          )}
        </View>
      ))}

      {adding ? (
        <VehicleForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <PrimaryButton title="Add New Vehicle" icon="plus" onPress={() => setAdding(true)} />
      )}

      <Text style={styles.tipsTitle}>Tips</Text>
      <View style={styles.tips}>
        <Feather name="info" size={18} color={ui.amber} />
        <View style={styles.flex}>
          <Text style={styles.tipTitle}>Vehicles are saved on this device</Text>
          <Muted>
            Your details go with a request when you send one. Saving vehicles to your account is not
            connected yet.
          </Muted>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  empty: { paddingVertical: spacing.lg, alignItems: 'center' },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: ui.card,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: ui.line,
    padding: spacing.md,
  },
  vehicleMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vehicleDefault: { borderColor: ui.orange, borderWidth: 1.5, backgroundColor: '#FFF9F5' },
  vehicleText: { flex: 1, gap: 3 },
  vehicleName: { color: ui.ink, fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  defaultTag: {
    alignSelf: 'flex-start',
    backgroundColor: ui.orange,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  defaultTagText: { color: '#FFFFFF', fontSize: fontSize.caption },
  remove: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.card,
  },
  tipsTitle: { color: ui.ink, fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  tips: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: ui.soft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  tipTitle: { color: ui.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});
