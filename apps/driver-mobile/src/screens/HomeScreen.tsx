import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius } from '@ridefix/ui-tokens';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card, Muted, Screen } from '../components/Screen';

export function HomeScreen() {
  return (
    <Screen title="Need help?">
      <View style={styles.mapPlaceholder}>
        <Muted>Map with your location (milestone 8)</Muted>
      </View>
      <Card dark>
        <Text style={styles.panelTitle}>Roadside assistance, garage service or tow truck</Text>
        <Text style={styles.panelBody}>Nearby providers send you bids. You choose.</Text>
      </Card>
      <PrimaryButton title="Request help" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapPlaceholder: {
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    color: colors.onPanel,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
  panelBody: { color: colors.onPanel, opacity: 0.8, fontSize: fontSize.body },
});
