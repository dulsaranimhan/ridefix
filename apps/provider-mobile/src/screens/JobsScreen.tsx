import { StyleSheet, Switch, Text, View } from 'react-native';
import { useState } from 'react';
import { colors, fontSize, fontWeight } from '@ridefix/ui-tokens';
import { Card, Muted, Screen } from '../components/Screen';

export function JobsScreen() {
  // Local only for now. Milestone 6 sends availability to the Matching Service.
  const [available, setAvailable] = useState(false);
  return (
    <Screen title="Jobs">
      <Card dark>
        <View style={styles.row}>
          <Text style={styles.panelTitle}>{available ? 'Available for jobs' : 'Offline'}</Text>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ true: colors.primary, false: colors.textMuted }}
          />
        </View>
      </Card>
      <Card>
        <Muted>
          Nearby eligible requests appear here. Tap one to send a bid with price and ETA.
        </Muted>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: {
    color: colors.onPanel,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
  },
});
