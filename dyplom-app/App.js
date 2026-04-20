import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { store, hydrateFavorites } from './src/app/store';
import AppNavigator from './src/app/navigation/AppNavigator';
import { initAuth } from './src/app/authInit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PushNotificationManager from './src/app/PushNotificationManager';
import { navigationRef } from './src/app/navigation/navigationRef';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initAuth();
      const state = store.getState();
      const userId = state.auth.user?._id || state.auth.user?.id || 'guest';
      const hasToken = !!state.auth.token;
      // Гидратация локального избранного только если нет токена (гость/offline)
      await hydrateFavorites(userId, hasToken);
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return null; // можно заменить на сплэш, если нужно
  }

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PushNotificationManager />
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <AppNavigator />
        </NavigationContainer>
      </GestureHandlerRootView>
    </Provider>
  );
}
