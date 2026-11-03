
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Card, Muted, Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, fontSize, fontWeight, spacing } from '@ridefix/ui-tokens';

export function ProfileScreen() {
  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();

            if (error) {
              Alert.alert('Logout failed', error.message);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen title="Profile">
      <Card>
        <Text style={styles.heading}>Provider Account</Text>
        <Muted>
          Manage your RideFix provider account and business details.
        </Muted>
      </Card>

      <Card>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
  },
  logoutButton: {
    backgroundColor: '#D9534F',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});
