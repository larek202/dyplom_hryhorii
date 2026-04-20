import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../../screens/Home';
import SearchScreen from '../../screens/Search';
import BookingScreen from '../../screens/Booking';
import EventDetailsScreen from '../../screens/EventDetails';
import FavoritesScreen from '../../screens/Favorites';
import OrganizerRegistrationScreen from '../../screens/Organizer/RegistrationScreen';
import OrganizerInfoScreen from '../../screens/Organizer/OrganizerInfoScreen';
import ProfileScreen from '../../screens/Profile';
import ProfileSettingsScreen from '../../screens/Profile/SettingsScreen';
import ChangePasswordScreen from '../../screens/Profile/ChangePasswordScreen';
import MapScreen from '../../screens/Map';
import AuthNavigator from './AuthNavigator';
import OrganizerNavigator from './OrganizerNavigator';
import { Colors } from '../../styles/colors';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const createStack = (name, Component, extraScreens = []) => {
  const Stack = createNativeStackNavigator();
  return () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={name} component={Component} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="OrganizerInfo" component={OrganizerInfoScreen} />
      {extraScreens.map(({ name: screenName, component }) => (
        <Stack.Screen key={screenName} name={screenName} component={component} />
      ))}
    </Stack.Navigator>
  );
};

const HomeStackNavigator = createStack('Home', HomeScreen, [
  { name: 'BecomeOrganizer', component: OrganizerRegistrationScreen },
  { name: 'FavoritesModal', component: FavoritesScreen },
]);
const SearchStackNavigator = createStack('Search', SearchScreen);
const BookingStackNavigator = createStack('Bookings', BookingScreen);
const ProfileStackNavigator = createStack('Profile', ProfileScreen, [
  { name: 'ProfileSettings', component: ProfileSettingsScreen },
  { name: 'ChangePassword', component: ChangePasswordScreen },
  { name: 'BecomeOrganizer', component: OrganizerRegistrationScreen },
  { name: 'Favorites', component: FavoritesScreen },
  { name: 'OrganizerPanel', component: OrganizerNavigator },
]);
const MapStackNavigator = createStack('Map', MapScreen);

const ICONS = {
  HomeTab: { active: 'home', inactive: 'home-outline' },
  SearchTab: { active: 'search', inactive: 'search-outline' },
  BookingTab: { active: 'calendar', inactive: 'calendar-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
  MapTab: { active: 'map', inactive: 'map-outline' },
  OrganizerTab: { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
};

const AppTabs = ({ role }) => (
  <Tab.Navigator
    screenOptions={({ route }) => {
      const iconKey = ICONS[route.name];
      const iconName = iconKey
        ? iconKey.active
        : 'square';
      return {
        headerShown: false,
        tabBarStyle: {
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
          height: 70,
          paddingHorizontal: 10,
          paddingTop: 2,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          const icon = iconKey ? (focused ? iconKey.active : iconKey.inactive) : 'square';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      };
    }}
  >
    <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Główna' }} />
    <Tab.Screen name="MapTab" component={MapStackNavigator} options={{ title: 'Mapa' }} />
    <Tab.Screen
      name="SearchTab"
      component={SearchStackNavigator}
      options={{ title: 'Szukaj' }}
    />
    <Tab.Screen
      name="BookingTab"
      component={BookingStackNavigator}
      options={{ title: 'Rezerwacje' }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileStackNavigator}
      options={{ title: 'Profil' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const authStatus = useSelector((state) => state.auth.status);
  const role = useSelector((state) => state.auth.user.role);

  // Показываем экран авторизации во время загрузки или если пользователь не авторизован
  if (authStatus === 'loading' || authStatus === 'guest') {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      </RootStack.Navigator>
    );
  }

  // Показываем основное приложение если пользователь авторизован
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main">
        {() => <AppTabs role={role} />}
      </RootStack.Screen>
    </RootStack.Navigator>
  );
};

export default AppNavigator;

