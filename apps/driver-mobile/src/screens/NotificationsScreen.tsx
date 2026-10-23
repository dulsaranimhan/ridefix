import { Card, Muted, Screen } from '../components/Screen';

export function NotificationsScreen() {
  return (
    <Screen title="Notifications">
      <Card>
        <Muted>New bids and booking updates appear here.</Muted>
      </Card>
    </Screen>
  );
}
