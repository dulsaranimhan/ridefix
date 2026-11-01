import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '@ridefix/ui-tokens';
import { Card, Muted, Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { supabase } from '../lib/supabase';

export function ProfileScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSignedInEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submitAuth() {
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const result = isSignUp
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
    } else if (isSignUp && !result.data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
    } else {
      setMessage(isSignUp ? 'Account created.' : 'Signed in.');
      setPassword('');
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setMessage(error?.message ?? 'Signed out.');
  }

  return (
    <Screen title="Profile">
      <Card>
        <Muted>Request history and receipts will be available here.</Muted>
      </Card>
      <Card>
        <Text style={styles.heading}>{signedInEmail ? 'Your account' : 'Optional sign-in'}</Text>
        {!supabase ? (
          <Muted>Sign-in is not configured yet. You can keep using the app without an account.</Muted>
        ) : signedInEmail ? (
          <>
            <Muted>Signed in as {signedInEmail}</Muted>
            <PrimaryButton title="Sign out" onPress={() => void signOut()} />
          </>
        ) : (
          <>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              style={styles.input}
              value={email}
            />
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Password (at least 6 characters)"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <PrimaryButton
              title={busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
              onPress={() => void submitAuth()}
              disabled={busy || !email.trim() || password.length < 6}
            />
            {busy && <ActivityIndicator color={colors.accent} />}
            <Text style={styles.link} onPress={() => { setIsSignUp(!isSignUp); setMessage(''); }}>
              {isSignUp ? 'Already have an account? Sign in' : 'New to RideFix? Create an account'}
            </Text>
          </>
        )}
        {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  input: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    padding: spacing.md,
  },
  link: { color: colors.accent, textAlign: 'center', paddingVertical: spacing.sm },
  message: { color: colors.text, fontSize: 14 },
});
