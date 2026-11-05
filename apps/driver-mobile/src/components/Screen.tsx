import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { ui } from '../theme';

/** Main tab screen. The bottom navigation sits below it. */
export function Screen({ children }: { children?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Full-screen step with a back button, a heading and an optional pinned footer action. */
export function FlowScreen({
  title,
  subtitle,
  onBack,
  headerRight,
  footer,
  children,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {(onBack || headerRight) && (
            <View style={styles.flowHeader}>
              {onBack ? <RoundButton icon="arrow-left" label="Back" onPress={onBack} /> : <View />}
              {headerRight}
            </View>
          )}
          {!!title && <PageTitle title={title} subtitle={subtitle} />}
          {children}
        </ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {!!subtitle && <Muted>{subtitle}</Muted>}
    </View>
  );
}

export function RoundButton({
  icon,
  label,
  onPress,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.round}
    >
      <Feather name={icon} size={20} color={ui.ink} />
      {children}
    </Pressable>
  );
}

export function Card({
  children,
  dark,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, dark && styles.cardDark, style]}>{children}</View>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: ui.background },
  content: { padding: spacing.lg + 4, gap: spacing.lg, flexGrow: 1 },
  flowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: {
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: ui.background,
  },
  titleBlock: { gap: spacing.xs },
  title: { fontSize: 28, fontWeight: fontWeight.bold, color: ui.ink },
  round: {
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
  card: {
    backgroundColor: ui.card,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: ui.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardDark: { backgroundColor: ui.dark, borderColor: ui.dark },
  muted: { fontSize: fontSize.body - 1, color: ui.muted, lineHeight: 20 },
  error: { color: ui.red, fontSize: fontSize.body - 1, lineHeight: 20 },
});
