import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { OutlineButton, PrimaryButton } from '../components/PrimaryButton';
import { Card, ErrorText, Muted } from '../components/Screen';
import { TextField } from '../components/parts';
import { useDriverData } from '../lib/driver-data';
import { ui } from '../theme';
import { RequestHistory } from './RequestHistory';

const MIN_PASSWORD_LENGTH = 8;

function SignInCard() {
  const { signIn, signUp } = useDriverData();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function submitAuth() {
    setBusy(true);
    setMessage('');
    try {
      if (isSignUp) {
        await signUp({ email: email.trim(), password, fullName: fullName.trim() });
      } else {
        await signIn({ email: email.trim(), password });
      }
      setPassword('');
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !!email.trim() &&
    password.length >= (isSignUp ? MIN_PASSWORD_LENGTH : 1) &&
    (!isSignUp || !!fullName.trim());

  return (
    <Card style={styles.authCard}>
      {isSignUp && (
        <TextField
          label="Full name"
          onChangeText={setFullName}
          placeholder="Kasun Perera"
          value={fullName}
        />
      )}
      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      <TextField
        label="Password"
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Your password'}
        secureTextEntry
        value={password}
      />
      <PrimaryButton
        title={busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
        onPress={() => void submitAuth()}
        disabled={busy || !canSubmit}
      />
      {busy && <ActivityIndicator color={ui.orange} />}
      <Text
        accessibilityRole="button"
        style={styles.link}
        onPress={() => {
          setIsSignUp(!isSignUp);
          setMessage('');
        }}
      >
        {isSignUp ? 'Already have an account? Sign in' : 'New to RideFix? Create an account'}
      </Text>
      {!!message && (isError ? <ErrorText>{message}</ErrorText> : <Muted>{message}</Muted>)}
    </Card>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user, displayName, vehicles, requests, signOut: endSession } = useDriverData();
  const [history, setHistory] = useState<'requests' | 'bookings' | null>(null);
  const [notice, setNotice] = useState('');

  if (history) {
    return (
      <RequestHistory
        title={history === 'requests' ? 'Request History' : 'Booking History'}
        bookingsOnly={history === 'bookings'}
        onBack={() => setHistory(null)}
      />
    );
  }

  async function signOut() {
    try {
      await endSession();
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not sign out.');
    }
  }

  const bookings = requests.filter((request) => request.providerId).length;
  const quickAccess = [
    {
      icon: 'car-side',
      title: 'My Vehicles',
      detail: `${vehicles.length} ${vehicles.length === 1 ? 'Vehicle' : 'Vehicles'}`,
      onPress: () => navigation.navigate('My Vehicles'),
    },
    {
      icon: 'clock-outline',
      title: 'Request History',
      detail: `${requests.length} ${requests.length === 1 ? 'Request' : 'Requests'}`,
      onPress: () => setHistory('requests'),
    },
    {
      icon: 'calendar-blank-outline',
      title: 'Booking History',
      detail: `${bookings} ${bookings === 1 ? 'Booking' : 'Bookings'}`,
      onPress: () => setHistory('bookings'),
    },
    {
      icon: 'credit-card-outline',
      title: 'Payment History',
      detail: 'View receipts',
      onPress: () => setNotice('Payment history is not connected yet. Payment is cash for now.'),
    },
  ] as const;
  const rows = [
    {
      icon: 'user',
      title: 'Personal Details',
      detail: 'Name, email, phone',
      notice: 'Editing personal details is not connected yet.',
    },
    {
      icon: 'settings',
      title: 'Settings',
      detail: 'Notifications, privacy',
      notice: 'Settings are not connected yet.',
    },
    {
      icon: 'help-circle',
      title: 'Help & Support',
      detail: 'FAQs, contact us',
      notice: 'Help & Support is not connected yet.',
    },
    {
      icon: 'info',
      title: 'About RideFix',
      detail: 'Version 1.0.0',
      notice: 'RideFix connects drivers with nearby roadside and garage providers.',
    },
  ] as const;

  return (
    <View style={styles.page}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <View style={styles.heroRow}>
              <View style={styles.avatar}>
                {user ? (
                  <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                ) : (
                  <Feather name="user" size={36} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.heroText}>
                <Text style={styles.name}>{user ? displayName : 'Welcome to RideFix'}</Text>
                <Text style={styles.heroDetail}>{user?.email ?? 'Sign in to send requests'}</Text>
              </View>
            </View>
            {user && (
              <View style={styles.member}>
                <MaterialCommunityIcons name="crown-outline" size={24} color="#E9B44C" />
                <View style={styles.heroText}>
                  <Text style={styles.memberTitle}>RideFix Member</Text>
                  <Text style={styles.memberBody}>Thanks for being part of RideFix.</Text>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {!user ? (
            <SignInCard />
          ) : (
            <>
              <Text style={styles.section}>Quick Access</Text>
              <View style={styles.grid}>
                {quickAccess.map((item) => (
                  <Pressable
                    key={item.title}
                    accessibilityRole="button"
                    onPress={item.onPress}
                    style={styles.quick}
                  >
                    <View style={styles.quickIcon}>
                      <MaterialCommunityIcons name={item.icon} size={20} color={ui.ink} />
                    </View>
                    <View style={styles.heroText}>
                      <Text style={styles.quickTitle}>{item.title}</Text>
                      <Text style={styles.quickDetail}>{item.detail}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={styles.list}>
                {rows.map((item, index) => (
                  <Pressable
                    key={item.title}
                    accessibilityRole="button"
                    onPress={() => setNotice(item.notice)}
                    style={[styles.listRow, index > 0 && styles.listRowLine]}
                  >
                    <Feather name={item.icon} size={20} color={ui.ink} />
                    <View style={styles.heroText}>
                      <Text style={styles.quickTitle}>{item.title}</Text>
                      <Text style={styles.quickDetail}>{item.detail}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={ui.muted} />
                  </Pressable>
                ))}
              </View>

              {!!notice && <Muted>{notice}</Muted>}
              <OutlineButton title="Log Out" danger icon="log-out" onPress={() => void signOut()} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: ui.background },
  hero: {
    backgroundColor: ui.dark,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroInner: { padding: spacing.lg + 4, gap: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: fontWeight.bold },
  heroText: { flex: 1, gap: 2 },
  name: { color: '#FFFFFF', fontSize: fontSize.title - 2, fontWeight: fontWeight.semibold },
  heroDetail: { color: '#D8DAE0', fontSize: fontSize.body - 1 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#6B5A2C',
    backgroundColor: '#2A2516',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  memberTitle: { color: '#E9B44C', fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  memberBody: { color: '#D8DAE0', fontSize: fontSize.caption },
  body: { padding: spacing.lg + 4, gap: spacing.lg },
  section: { color: ui.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quick: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ui.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: { color: ui.ink, fontSize: fontSize.body - 1, fontWeight: fontWeight.medium },
  quickDetail: { color: ui.muted, fontSize: fontSize.caption },
  list: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  listRowLine: { borderTopWidth: 1, borderTopColor: ui.line },
  authCard: { gap: spacing.md },
  link: { color: ui.orange, textAlign: 'center', paddingVertical: spacing.sm },
});
