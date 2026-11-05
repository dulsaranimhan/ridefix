import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { orangeGradient, ui } from '../theme';

interface Props {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  trailingArrow?: boolean;
}

/** Orange-gradient primary action used for the main call to action on a screen. */
export function PrimaryButton({ title, onPress, disabled, icon, trailingArrow }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.wrap, (pressed || disabled) && styles.dim]}
    >
      <LinearGradient
        colors={orangeGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {icon && <Feather name={icon} size={18} color="#FFFFFF" />}
        <Text style={styles.label}>{title}</Text>
        {trailingArrow && <Feather name="arrow-right" size={18} color="#FFFFFF" />}
      </LinearGradient>
    </Pressable>
  );
}

export function OutlineButton({
  title,
  onPress,
  disabled,
  danger,
  icon,
}: Props & { danger?: boolean }) {
  const color = danger ? ui.red : ui.orange;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.outline,
        { borderColor: color },
        (pressed || disabled) && styles.dim,
      ]}
    >
      {icon && <Feather name={icon} size={18} color={color} />}
      <Text style={[styles.outlineLabel, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.pill, overflow: 'hidden' },
  dim: { opacity: 0.6 },
  gradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: { color: '#FFFFFF', fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  outline: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg - 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: ui.card,
  },
  outlineLabel: { fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
});
