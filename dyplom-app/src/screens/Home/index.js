import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { useListEventsQuery } from '../../features/events/api';
import { useCreateBookingMutation, useGetBookingsQuery, useDeleteBookingMutation } from '../../features/bookings/api';
import EventCard from '../../components/EventCard';
import { Colors } from '../../styles/colors';
import TextInputField from '../../components/Forms/TextInputField';
import { addFavorite, removeFavorite } from '../../features/favorites';
import { useAddFavoriteMutation, useRemoveFavoriteMutation } from '../../features/favorites/api';

const TOP_CITIES = [
  'Warszawa',
  'Kraków',
  'Łódź',
  'Wrocław',
  'Poznań',
  'Gdańsk',
  'Szczecin',
  'Bydgoszcz',
  'Lublin',
  'Białystok',
];

const HomeScreen = ({ navigation }) => {
  const eventsFromStore = useSelector((state) => state.events.list);
  const bookings = useSelector((state) => state.bookings.list);
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const userId = useSelector((state) => state.auth.user?._id || state.auth.user?.id);
  const eventLookup = useSelector((state) =>
    state.events.list.reduce((acc, event) => {
      acc[event.id] = event;
      return acc;
    }, {})
  );
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const [addFavoriteApi] = useAddFavoriteMutation();
  const [removeFavoriteApi] = useRemoveFavoriteMutation();
  const {
    data: asyncEvents,
    refetch,
    isFetching,
  } = useListEventsQuery();
  const [createBooking] = useCreateBookingMutation();
  const [cancelBooking] = useDeleteBookingMutation();
  useGetBookingsQuery({ userId }, { skip: !isAuthenticated, refetchOnMountOrArgChange: true });
  const events = asyncEvents ?? eventsFromStore;
  const [selectedCity, setSelectedCity] = useState(TOP_CITIES[0] ?? 'Warszawa');
  const cities = useMemo(() => {
    if (!selectedCity) return TOP_CITIES;
    const rest = TOP_CITIES.filter((city) => city !== selectedCity);
    return [selectedCity, ...rest];
  }, [selectedCity]);
  const [customCity, setCustomCity] = useState('');
  const manualCityRef = useRef(false);
  const normalizeId = useCallback((v) => (v?._id || v?.id || v)?.toString?.() ?? '', []);
  const bookingsList = bookings;
  const bookedSet = useMemo(
    () => new Set((bookingsList || []).map((b) => normalizeId(b.eventId))),
    [bookingsList, normalizeId]
  );

  const toggleFavorite = useCallback(
    async (eventId) => {
      if (!eventId) return;
      const isFav = favoriteIds.includes(eventId);
      try {
        if (isFav) {
          dispatch(removeFavorite(eventId));
          await removeFavoriteApi(eventId);
        } else {
          dispatch(addFavorite(eventId));
          await addFavoriteApi(eventId);
        }
      } catch {
        // rollback UI state if request failed
        if (isFav) {
          dispatch(addFavorite(eventId));
        } else {
          dispatch(removeFavorite(eventId));
        }
      }
    },
    [dispatch, addFavoriteApi, removeFavoriteApi, favoriteIds]
  );

  const upcomingBookings = useMemo(() => {
    return bookings
      .map((booking) => {
        const event = eventLookup[booking.eventId];
        return event
          ? {
              ...booking,
              event,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings, eventLookup]);

  const activeCity = customCity.trim() || selectedCity;

  useEffect(() => {
    if (cities.length && !cities.includes(selectedCity)) {
      setSelectedCity(cities[0]);
    }
  }, [cities, selectedCity]);

  const resolveCityFromLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      const cityLabel =
        place?.city ||
        place?.subregion ||
        place?.region ||
        '';
      if (!cityLabel || manualCityRef.current) return;
      const matched = TOP_CITIES.find(
        (city) => city.toLowerCase() === cityLabel.toLowerCase()
      );
      if (matched) {
        setSelectedCity(matched);
        setCustomCity('');
      } else {
        setCustomCity(cityLabel);
      }
    } catch {
      // ignore location errors
    }
  }, []);

  useEffect(() => {
    resolveCityFromLocation();
  }, [resolveCityFromLocation]);

  const [refreshing, setRefreshing] = useState(false);

  const isSameDay = useCallback((date, baseDate = new Date()) => {
    if (!date) return false;
    const d = new Date(date);
    return (
      d.getFullYear() === baseDate.getFullYear() &&
      d.getMonth() === baseDate.getMonth() &&
      d.getDate() === baseDate.getDate()
    );
  }, []);

  const filteredEvents = events.filter((event) =>
    activeCity ? event.city.toLowerCase().includes(activeCity.toLowerCase()) : true
  );

  const todayEvents = useMemo(
    () => filteredEvents.filter((event) => isSameDay(event.date)),
    [filteredEvents, isSameDay]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container} key="home-container">
        <FlatList
          data={todayEvents || []}
          keyExtractor={(item) => item._id || item.id || String(item)}
          renderItem={({ item }) => {
            const eventId = item._id || item.id;
            return (
              <EventCard
                item={item}
                onPress={() => navigation.navigate('EventDetails', { eventId })}
                isFavorite={favoriteIds.includes(eventId)}
                onFavoriteToggle={() => toggleFavorite(eventId)}
                bookingState={
              bookedSet.has(normalizeId(eventId)) ? 'booked' : 'free'
            }
                onBook={async () => {
                  if (!eventId) return;
              const already = bookedSet.has(normalizeId(eventId));
                  try {
                    if (already) {
                      // отмена
                      await cancelBooking({ eventId }).unwrap();
                    } else {
                      await createBooking({ eventId }).unwrap();
                    }
                  } catch (e) {
                    console.warn('Booking toggle failed', e);
                  }
                }}
              />
            );
          }}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text key="logo" style={styles.logo}>MoveMint</Text>
              <Text key="subtitle" style={styles.subtitle}>Sportowe aktywności w Twoim rytmie</Text>
              {upcomingBookings.length > 0 && (
                <View key="upcoming-bookings" style={styles.glassCard}>
                  <Text style={styles.cardTitle}>Nadchodzące rezerwacje</Text>
                  {upcomingBookings.slice(0, 2).map((booking) => (
                    <View key={booking.id} style={styles.upcomingItem}>
                      <Text style={styles.upcomingEvent}>{booking.event.title}</Text>
                      <Text style={styles.upcomingMeta}>
                        {new Date(booking.date).toLocaleDateString('pl-PL')} • {booking.seats} miejsca
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <View key="city-selector" style={styles.row}>
                <Text style={styles.sectionTitle}>Wybierz miasto</Text>
              </View>
              <TextInputField
                key="custom-city-input"
                label="Inne miasto"
                placeholder="Wpisz nazwę miasta"
                value={customCity}
                onChangeText={(value) => {
                  manualCityRef.current = true;
                  setCustomCity(value);
                }}
              />
              <ScrollView
                key="city-chips"
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {cities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.chip,
                      !customCity && selectedCity === city && styles.chipActive,
                    ]}
                    onPress={() => {
                      manualCityRef.current = true;
                      setSelectedCity(city);
                      setCustomCity('');
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        !customCity && selectedCity === city && styles.chipTextActive,
                      ]}
                    >
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text key="events-title" style={styles.title}>Wydarzenia na dziś</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.empty}>Brak wydarzeń na dziś.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SearchTab')} activeOpacity={0.7}>
                <Text style={styles.emptyLink}>Przejdź do wyszukiwania</Text>
              </TouchableOpacity>
            </View>
          }
          removeClippedSubviews={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 16,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 8,
  },
  emptyLink: {
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  glassCard: {
    backgroundColor: 'rgba(248, 250, 255, 0.8)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#C6C9D9',
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  cardTitle: {
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 12,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  upcomingItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  upcomingEvent: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  upcomingMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
});

export default HomeScreen;

