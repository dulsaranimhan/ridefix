import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@ridefix/ui-tokens';
import { DriverTabBar } from './src/components/parts';
import { DriverDataProvider } from './src/lib/driver-data';
import { ui } from './src/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { VehiclesScreen } from './src/screens/VehiclesScreen';

const Tab = createBottomTabNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: ui.background,
    card: ui.background,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <DriverDataProvider>
        <NavigationContainer theme={theme}>
          <Tab.Navigator
            tabBar={(props) => <DriverTabBar {...props} />}
            screenOptions={{ headerShown: false }}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="My Vehicles" component={VehiclesScreen} />
            <Tab.Screen name="Notifications" component={NotificationsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </DriverDataProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
