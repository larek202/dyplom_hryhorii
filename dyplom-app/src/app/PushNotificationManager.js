import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../services/api';
import { navigationRef } from './navigation/navigationRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PushNotificationManager = () => {
  const token = useSelector((state) => state.auth.token);
  const userId = useSelector((state) => state.auth.user?._id || state.auth.user?.id);
  const pushEnabled = useSelector((state) => state.auth.user?.pushEnabled !== false);
  const lastTokenRef = useRef(null);
  const responseListener = useRef(null);
  const receivedListener = useRef(null);

  const handleNotificationNavigation = useCallback((data) => {
    const eventId = data?.eventId || data?.event_id || data?.event;
    if (!eventId || !navigationRef.isReady()) return;
    navigationRef.navigate('HomeTab', {
      screen: 'EventDetails',
      params: { eventId },
    });
  }, []);

  const registerForPushNotifications = useCallback(async () => {
    if (!token || !userId || !pushEnabled) return;
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1D73FF',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    if (!projectId) return;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoToken = tokenResponse.data;
    if (!expoToken || expoToken === lastTokenRef.current) return;
    lastTokenRef.current = expoToken;

    await api.post('/push-tokens', {
      token: expoToken,
      platform: Platform.OS,
    });
  }, [token, userId, pushEnabled]);

  useEffect(() => {
    registerForPushNotifications().catch((e) => {
      if (__DEV__) {
        console.warn('⚠️ Push registration failed:', e?.message || e);
      }
    });
  }, [registerForPushNotifications]);

  useEffect(() => {
    receivedListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationNavigation(response?.notification?.request?.content?.data);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      handleNotificationNavigation(response?.notification?.request?.content?.data);
    });

    return () => {
      receivedListener.current?.remove?.();
      responseListener.current?.remove?.();
    };
  }, [handleNotificationNavigation]);

  return null;
};

export default PushNotificationManager;