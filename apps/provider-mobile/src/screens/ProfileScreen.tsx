import { Card, Muted, Screen } from '../components/Screen';

export function ProfileScreen() {
  return (
    <Screen title="Profile">
      <Card>
        <Muted>
          Business details and services offered. Sign-in through the self-hosted auth service arrives in a later milestone.
        </Muted>
      </Card>
    </Screen>
  );
}
