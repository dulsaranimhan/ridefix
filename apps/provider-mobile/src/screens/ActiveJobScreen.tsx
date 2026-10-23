import { Card, Muted, Screen } from '../components/Screen';

export function ActiveJobScreen() {
  return (
    <Screen title="Active job">
      <Card>
        <Muted>
          Status updates (on the way, in progress, done) and location sharing. Sharing runs only
          during an active booking.
        </Muted>
      </Card>
    </Screen>
  );
}
