import { Card, Muted, Screen } from '../components/Screen';

export function ProfileScreen() {
  return (
    <Screen title="Profile">
      <Card>
        <Muted>
          Sign-in with Supabase arrives in milestone 6. Request history and receipts live here.
        </Muted>
      </Card>
    </Screen>
  );
}
