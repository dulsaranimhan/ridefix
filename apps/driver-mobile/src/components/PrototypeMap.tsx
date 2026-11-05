import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { fontWeight, radius } from '@ridefix/ui-tokens';
import { ui } from '../theme';

/**
 * Drawn illustration of a map, as in the design. It is not a real map: the pin does not move with
 * the coordinates and no live provider location is connected yet.
 */
export function PrototypeMap({
  height = 180,
  mode = 'pin',
  label,
  note,
}: {
  height?: number;
  mode?: 'pin' | 'route';
  label?: string;
  note?: string;
}) {
  return (
    <View accessibilityLabel="Illustrated map" style={[styles.map, { height }]}>
      <View style={styles.water} />
      <View style={styles.park} />
      <View style={[styles.roadV, { left: '25%' }]} />
      <View style={[styles.roadV, { left: '72%' }]} />
      <View style={[styles.roadH, { top: '30%' }]} />
      <View style={[styles.roadH, { top: '62%' }]} />

      {mode === 'pin' ? (
        <View style={styles.pinArea}>
          {!!label && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{label}</Text>
            </View>
          )}
          <View style={styles.halo}>
            <View style={styles.dot} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.routeH} />
          <View style={styles.routeVLeft} />
          <View style={styles.routeVRight} />
          <View style={styles.destination}>
            <View style={styles.dot} />
          </View>
          <View style={styles.vehicle}>
            <Feather name="navigation" size={16} color="#FFFFFF" />
          </View>
          {!!label && (
            <View style={[styles.tag, styles.routeTag]}>
              <Text style={styles.tagText}>{label}</Text>
            </View>
          )}
        </>
      )}
      {!!note && (
        <View style={styles.note}>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: radius.lg + 2,
    overflow: 'hidden',
    backgroundColor: ui.mapBase,
    width: '100%',
  },
  water: {
    position: 'absolute',
    left: -30,
    bottom: -30,
    width: '48%',
    height: '45%',
    borderTopRightRadius: 70,
    backgroundColor: ui.mapWater,
  },
  park: {
    position: 'absolute',
    right: '6%',
    top: '6%',
    width: '26%',
    height: '28%',
    borderRadius: 18,
    backgroundColor: ui.mapPark,
  },
  roadV: { position: 'absolute', top: 0, bottom: 0, width: 10, backgroundColor: '#FFFFFF' },
  roadH: { position: 'absolute', left: 0, right: 0, height: 10, backgroundColor: '#FFFFFF' },
  pinArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: ui.dark,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  tagText: { color: '#FFFFFF', fontSize: 12, fontWeight: fontWeight.medium },
  halo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(238,122,58,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ui.orangeDeep,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  routeH: {
    position: 'absolute',
    top: '62%',
    left: '25%',
    width: '47%',
    height: 5,
    marginTop: 3,
    marginLeft: 3,
    backgroundColor: ui.orange,
  },
  routeVLeft: {
    position: 'absolute',
    top: '62%',
    bottom: '12%',
    left: '25%',
    width: 5,
    marginLeft: 3,
    backgroundColor: ui.orange,
  },
  routeVRight: {
    position: 'absolute',
    top: '12%',
    bottom: '38%',
    left: '72%',
    width: 5,
    marginLeft: 3,
    backgroundColor: ui.orange,
  },
  destination: { position: 'absolute', top: '9%', left: '72%', marginLeft: -3 },
  vehicle: {
    position: 'absolute',
    bottom: '8%',
    left: '25%',
    marginLeft: -11,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ui.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTag: { position: 'absolute', top: '40%', left: '38%' },
  note: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  noteText: { color: ui.muted, fontSize: 11 },
});
