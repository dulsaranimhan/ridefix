import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';

export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <View style={[styles.card, dark && styles.cardDark]}>{children}</View>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.display, fontWeight: fontWeight.bold, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardDark: { backgroundColor: colors.panel },
  muted: { fontSize: fontSize.body, color: colors.textMuted },
});
