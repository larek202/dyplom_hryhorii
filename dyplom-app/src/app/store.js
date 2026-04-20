import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth';
import { eventsReducer } from '../features/events';
import { bookingsReducer } from '../features/bookings';
import { favoritesReducer, setFavorites } from '../features/favorites';
import { organizerReducer } from '../features/organizer';
import { eventsApi } from '../features/events/api';
import { authApi } from '../features/auth/api';
import { organizerApi } from '../features/organizer/api';
import { favoritesApi } from '../features/favorites/api';
import { bookingsApi } from '../features/bookings/api';

const rootReducer = combineReducers({
  auth: authReducer,
  events: eventsReducer,
  bookings: bookingsReducer,
  favorites: favoritesReducer,
  organizer: organizerReducer,
  [eventsApi.reducerPath]: eventsApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [organizerApi.reducerPath]: organizerApi.reducer,
  [favoritesApi.reducerPath]: favoritesApi.reducer,
  [bookingsApi.reducerPath]: bookingsApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      eventsApi.middleware,
      authApi.middleware,
      organizerApi.middleware,
      favoritesApi.middleware,
      bookingsApi.middleware
    ),
});

// --- Простое сохранение избранного в AsyncStorage ---
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favorites_ids';

// Экспортируем функцию гидратации, чтобы вызывать её из App (гарантия, что хранилище готово)
export const hydrateFavorites = async (userId, skip = false) => {
  if (skip) return;
  const key = `${FAVORITES_KEY}_${userId || 'guest'}`;
  try {
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      store.dispatch(setFavorites(Array.isArray(parsed) ? parsed : []));
    }
  } catch (e) {
    console.warn('Nie udało się załadować ulubionych z AsyncStorage', e);
  }
};

// Подписка на изменения избранного и сохранение
let lastSavedJson = null;
let lastKey = null;
store.subscribe(() => {
  try {
    const ids = store.getState().favorites.ids;
    const userId = store.getState().auth.user?._id || store.getState().auth.user?.id || 'guest';
    const key = `${FAVORITES_KEY}_${userId}`;
    const nextJson = JSON.stringify(ids);
    if (nextJson !== lastSavedJson || key !== lastKey) {
      lastSavedJson = nextJson;
      lastKey = key;
      AsyncStorage.setItem(key, nextJson).catch(() => {});
    }
  } catch (e) {
    // ignorujemy błędy zapisu
  }
});





