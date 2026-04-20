import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrganizerScreen from '../../screens/Organizer';
import EventDetailsScreen from '../../screens/EventDetails';
import CreateEventScreen from '../../screens/Organizer/CreateEventScreen';
import OrganizerRegistrationScreen from '../../screens/Organizer/RegistrationScreen';
import OrganizerInfoScreen from '../../screens/Organizer/OrganizerInfoScreen';

const Stack = createNativeStackNavigator();

const OrganizerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OrganizerHome" component={OrganizerScreen} />
    <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
    <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
    <Stack.Screen name="BecomeOrganizer" component={OrganizerRegistrationScreen} />
    <Stack.Screen name="OrganizerInfo" component={OrganizerInfoScreen} />
  </Stack.Navigator>
);

export default OrganizerNavigator;








