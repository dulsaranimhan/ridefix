import { Card, Muted, Screen } from '../components/Screen';

export function NotificationsScreen() {
  return (
    <Screen title="Notifications">
      <Card>
        <Muted>New nearby requests and accepted bids appear here.</Muted>
      </Card>
    </Screen>
  );
}
