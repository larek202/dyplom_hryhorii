import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './store';
import { setCredentials, setLoading, updateUser } from '../features/auth';
import { authApi } from '../features/auth/api';
import { favoritesApi } from '../features/favorites/api';
import { bookingsApi } from '../features/bookings/api';

// Инициализация аутентификации при запуске приложения
export const initAuth = async () => {
  try {
    store.dispatch(setLoading(true));
    
    const token = await AsyncStorage.getItem('authToken');
    
    if (!token) {
      store.dispatch(setLoading(false));
      return;
    }

    // Проверяем токен и получаем данные пользователя
    const result = await store.dispatch(
      authApi.endpoints.getMe.initiate()
    );

    if (result.data && result.data.user) {
      // Токен валиден, сохраняем данные пользователя
      store.dispatch(setCredentials({
        user: result.data.user,
        token,
      }));

      const userId = result.data.user.id || result.data.user._id;
      const storageKey = `push_enabled_${userId || 'guest'}`;
      const storedPush = await AsyncStorage.getItem(storageKey);
      if (storedPush !== null && typeof result.data.user.pushEnabled !== 'boolean') {
        const enabled = storedPush === '1';
        store.dispatch(updateUser({ pushEnabled: enabled }));
        store.dispatch(
          authApi.endpoints.updateNotifications.initiate({ pushEnabled: enabled })
        );
      }
      // Загружаем избранное пользователя из backend (ключуем по userId)
      store.dispatch(
        favoritesApi.endpoints.getFavorites.initiate(
          { userId },
          { forceRefetch: true }
        )
      );
      // Загружаем бронирования пользователя
      store.dispatch(
        bookingsApi.endpoints.getBookings.initiate(
          { userId },
          { forceRefetch: true }
        )
      );
    } else {
      // Токен невалиден, удаляем его
      await AsyncStorage.removeItem('authToken');
    }
  } catch (error) {
    console.error('Auth init error:', error);
    await AsyncStorage.removeItem('authToken');
  } finally {
    store.dispatch(setLoading(false));
  }
};




