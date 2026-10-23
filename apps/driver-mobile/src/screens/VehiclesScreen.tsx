import { Card, Muted, Screen } from '../components/Screen';

export function VehiclesScreen() {
  return (
    <Screen title="My Vehicles">
      <Card>
        <Muted>
          Your saved vehicles appear here. (Data owner still to be agreed, see
          docs/open-questions.md.)
        </Muted>
      </Card>
    </Screen>
  );
}
