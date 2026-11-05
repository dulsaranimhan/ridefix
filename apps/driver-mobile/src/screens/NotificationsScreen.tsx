import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, spacing } from '@ridefix/ui-tokens';
import { ErrorText, Muted, PageTitle, Screen } from '../components/Screen';
import { FilterChip, IconTile } from '../components/parts';
import {
  formatDateTime,
  formatTime,
  useDriverData,
  type DriverNotification,
} from '../lib/driver-data';
import { ui } from '../theme';

const FILTERS = ['All', 'Requests', 'Bids', 'Bookings', 'System'] as const;

const ICONS: Record<
  DriverNotification['status'],
  { name: keyof typeof Feather.glyphMap; color: string; background: string }
> = {
  bid: { name: 'clipboard', color: ui.amber, background: ui.amberTint },
  submitted: { name: 'file-text', color: ui.orange, background: ui.tint },
  confirmed: { name: 'calendar', color: ui.purple, background: ui.purpleTint },
  enRoute: { name: 'clock', color: ui.blue, background: ui.blueTint },
  progress: { name: 'truck', color: ui.orange, background: ui.tint },
  completed: { name: 'check-circle', color: ui.green, background: ui.greenTint },
  cancelled: { name: 'x-circle', color: ui.muted, background: ui.soft },
  welcome: { name: 'circle', color: ui.muted, background: ui.soft },
};

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDateTime(iso).split(',')[0] ?? iso;
}

export function NotificationsScreen() {
  const { notifications, isUnread, markNotificationsRead, refreshError, user } = useDriverData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  // Marks items read when leaving the tab, so the unread dots stay visible while reading.
  const markRead = useRef(markNotificationsRead);
  markRead.current = markNotificationsRead;
  useFocusEffect(useCallback(() => () => markRead.current(), []));

  const visible = notifications.filter((item) => filter === 'All' || item.group === filter);
  const days = [...new Set(visible.map((item) => dayLabel(item.at)))];

  return (
    <Screen>
      <PageTitle title="Notifications" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <FilterChip
              key={item}
              label={item}
              selected={filter === item}
              onPress={() => setFilter(item)}
            />
          ))}
        </View>
      </ScrollView>

      {!!refreshError && <ErrorText>{refreshError}</ErrorText>}
      {visible.length === 0 && (
        <View style={styles.empty}>
          <Muted>{user ? 'Nothing here yet.' : 'Sign in from Profile to see your updates.'}</Muted>
        </View>
      )}

      {days.map((day) => (
        <View key={day} style={styles.group}>
          <Text style={styles.day}>{day}</Text>
          {visible
            .filter((item) => dayLabel(item.at) === day)
            .map((item) => (
              <View key={item.id} style={styles.row}>
                <IconTile {...ICONS[item.status]} size={46} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Muted>{item.body}</Muted>
                </View>
                <View style={styles.rowMeta}>
                  <Text style={styles.time}>{formatTime(item.at)}</Text>
                  {isUnread(item) && <View style={styles.unread} />}
                </View>
              </View>
            ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterScroll: { flexGrow: 0 },
  filters: { flexDirection: 'row', gap: spacing.sm },
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  group: { gap: spacing.xs },
  day: { color: ui.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ui.line,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: ui.ink, fontSize: fontSize.body - 1, fontWeight: fontWeight.semibold },
  rowMeta: { alignItems: 'flex-end', gap: spacing.sm },
  time: { color: ui.muted, fontSize: fontSize.caption },
  unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.orangeDeep },
});
