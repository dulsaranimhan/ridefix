import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, fontWeight, primaryGradient, radius, spacing } from '@ridefix/ui-tokens';

interface Props {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
}

/** Orange-gradient primary action used for the main call to action on a screen. */
export function PrimaryButton({ title, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.wrap, (pressed || disabled) && styles.dim]}
    >
      <LinearGradient
        colors={primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.label}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.pill, overflow: 'hidden' },
  dim: { opacity: 0.7 },
  gradient: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, alignItems: 'center' },
  label: { color: colors.onPrimary, fontSize: fontSize.subtitle, fontWeight: fontWeight.bold },
});
