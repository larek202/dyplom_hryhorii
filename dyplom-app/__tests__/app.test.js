jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('../src/features/auth', () => require('../src/features/auth/authSlice'));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventCard from '../src/components/EventCard';
import authReducer, {
  setCredentials,
  logout,
  updateUser,
  promoteToOrganizer,
} from '../src/features/auth/authSlice';
import favoritesReducer, { addFavorite } from '../src/features/favorites/favoritesSlice';
import bookingsReducer, {
  setBookings,
  addBooking,
  cancelBooking,
} from '../src/features/bookings/bookingsSlice';
import { uploadImages } from '../src/utils/uploadImages';
import { Colors } from '../src/styles/colors';

describe('Unit tests - dyplom-app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('auth/setCredentials ustawia usera, token i zapisuje token', () => {
    const action = setCredentials({
      user: { id: '1', name: 'Jan', role: 'user' },
      token: 'token-123',
    });
    const state = authReducer(undefined, action);

    expect(state.user).toEqual({ id: '1', name: 'Jan', role: 'user' });
    expect(state.token).toBe('token-123');
    expect(state.status).toBe('authenticated');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'token-123');
  });

  test('auth/logout czyści dane i usuwa token', () => {
    const loggedState = authReducer(
      undefined,
      setCredentials({ user: { id: '1', name: 'Jan', role: 'user' }, token: 'abc' })
    );
    const state = authReducer(loggedState, logout());

    expect(state.user.id).toBe('guest');
    expect(state.status).toBe('guest');
    expect(state.token).toBe(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
  });

  test('auth/updateUser scala nowe dane z istniejącym userem', () => {
    const baseState = authReducer(
      undefined,
      setCredentials({ user: { id: '1', name: 'Jan', role: 'user' }, token: 't' })
    );
    const state = authReducer(baseState, updateUser({ firstName: 'Jan', city: 'Gdańsk' }));

    expect(state.user.id).toBe('1');
    expect(state.user.name).toBe('Jan');
    expect(state.user.firstName).toBe('Jan');
    expect(state.user.city).toBe('Gdańsk');
    expect(state.user.role).toBe('user');
  });

  test('favorites/addFavorite dodaje element tylko raz', () => {
    const state1 = favoritesReducer(undefined, addFavorite('event-1'));
    const state2 = favoritesReducer(state1, addFavorite('event-1'));

    expect(state2.ids).toEqual(['event-1']);
  });

  test('favorites/logout czyści listę polubień', () => {
    const initial = { ids: ['a', 'b'] };
    const state = favoritesReducer(initial, logout());

    expect(state.ids).toEqual([]);
  });

  test('auth/promoteToOrganizer ustawia rolę organizer i status authenticated', () => {
    const baseState = authReducer(
      undefined,
      setCredentials({ user: { id: '1', name: 'Jan', role: 'user' }, token: 't' })
    );
    const state = authReducer(baseState, promoteToOrganizer());

    expect(state.user.role).toBe('organizer');
    expect(state.status).toBe('authenticated');
  });

  test('bookings/setBookings ignoruje nie‑tablicę', () => {
    const state = bookingsReducer(undefined, setBookings('invalid'));

    expect(state.list).toEqual([]);
  });

  test('bookings/addBooking dodaje nową rezerwację', () => {
    const state = bookingsReducer(undefined, addBooking({ id: 'b-1' }));
    expect(state.list).toEqual([{ id: 'b-1' }]);
  });

  test('bookings/cancelBooking usuwa rezerwację po id', () => {
    const initial = { list: [{ id: '1' }, { id: '2' }] };
    const state = bookingsReducer(initial, cancelBooking('1'));

    expect(state.list).toEqual([{ id: '2' }]);
  });

  test('utils/uploadImages zwraca [] dla pustej listy', async () => {
    const result = await uploadImages([]);
    expect(result).toEqual([]);
  });

  test('utils/uploadImages zwraca tylko remote URL bez wywołania fetch', async () => {
    global.fetch = jest.fn();
    const result = await uploadImages(['https://example.com/a.jpg']);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(['https://example.com/a.jpg']);
  });

  test('utils/uploadImages łączy remote i nowe zdjęcia po uploadzie', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, images: ['https://cdn.com/new.jpg'] }),
    });

    const result = await uploadImages(['file://local.jpg', 'https://example.com/a.jpg']);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['https://example.com/a.jpg', 'https://cdn.com/new.jpg']);
  });

  test('utils/uploadImages rzuca błąd gdy response.ok === false', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Serwer error' }),
    });

    await expect(uploadImages(['file://local.jpg'])).rejects.toThrow('Serwer error');
  });

  test('utils/uploadImages rzuca błąd gdy response.json() zawodzi', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Bad JSON');
      },
    });

    await expect(uploadImages(['file://local.jpg'])).rejects.toThrow('Bad JSON');
  });

  test('EventCard pokazuje tylko 2 kategorie i znak "+" gdy jest ich więcej', () => {
    const item = {
      title: 'Tytuł',
      description: 'Opis',
      city: 'Warszawa',
      date: '2026-01-31T21:30:00.000Z',
      booked: 2,
      slots: 10,
      category: 'A',
      categories: ['Taniec', 'Joga', 'Bieganie'],
      images: [],
      image: 'https://placehold.co/600x360?text=Wydarzenie',
    };

    const { getByText } = render(<EventCard item={item} />);
    expect(getByText('Taniec, Joga +')).toBeTruthy();
  });

  test('EventCard pokazuje czerwone serce dla polubionych', () => {
    const item = {
      title: 'Tytuł',
      description: 'Opis',
      city: 'Gdańsk',
      date: '2026-01-31T21:30:00.000Z',
      booked: 2,
      slots: 10,
      categories: ['Taniec'],
      images: [],
      image: 'https://placehold.co/600x360?text=Wydarzenie',
    };

    const { getByText } = render(<EventCard item={item} isFavorite />);
    expect(getByText(`heart-${Colors.danger}`)).toBeTruthy();
  });

  test('EventCard wywołuje onFavoriteToggle z id wydarzenia', () => {
    const item = {
      _id: 'event-123',
      title: 'Tytuł',
      description: 'Opis',
      city: 'Gdańsk',
      date: '2026-01-31T21:30:00.000Z',
      booked: 2,
      slots: 10,
      categories: ['Taniec'],
      images: [],
      image: 'https://placehold.co/600x360?text=Wydarzenie',
    };
    const onFavoriteToggle = jest.fn();

    const { getByText } = render(
      <EventCard item={item} onFavoriteToggle={onFavoriteToggle} />
    );
    fireEvent.press(getByText(`heart-outline-${Colors.surface}`));

    expect(onFavoriteToggle).toHaveBeenCalledWith('event-123');
  });

  test('EventCard wywołuje onPress i onBook po kliknięciu przycisków', () => {
    const item = {
      id: 'event-234',
      title: 'Tytuł',
      description: 'Opis',
      city: 'Gdańsk',
      date: '2026-01-31T21:30:00.000Z',
      booked: 2,
      slots: 10,
      categories: ['Taniec'],
      images: [],
      image: 'https://placehold.co/600x360?text=Wydarzenie',
    };
    const onPress = jest.fn();
    const onBook = jest.fn();

    const { getByText } = render(
      <EventCard item={item} onPress={onPress} onBook={onBook} />
    );
    fireEvent.press(getByText('Zobacz szczegóły'));
    fireEvent.press(getByText('Rezerwuj'));

    expect(onPress).toHaveBeenCalledWith(item);
    expect(onBook).toHaveBeenCalledWith(item);
  });

  test('EventCard używa lokalnego placeholdera gdy brak images i image', () => {
    const item = {
      id: 'event-999',
      title: 'Tytuł',
      description: 'Opis',
      city: 'Gdańsk',
      date: '2026-01-31T21:30:00.000Z',
      booked: 2,
      slots: 10,
      categories: ['Taniec'],
    };

    const { UNSAFE_getAllByType } = render(<EventCard item={item} />);
    const [image] = UNSAFE_getAllByType(Image);

    const fallbackImage = require('../assets/icon.png');
    expect(image.props.source).toBe(fallbackImage);
  });

  test('EventCard używa pola category gdy brak categories', () => {
    const item = {
      title: 'Tytuł',
      description: 'Opis',
      city: 'Kraków',
      date: '2026-01-31T21:30:00.000Z',
      booked: 2,
      slots: 10,
      category: 'Joga',
      images: [],
      image: 'https://placehold.co/600x360?text=Wydarzenie',
    };

    const { getByText } = render(<EventCard item={item} />);
    expect(getByText('Joga')).toBeTruthy();
  });
});

