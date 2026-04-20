import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Colors } from '../../styles/colors';
import { useListEventsQuery } from '../../features/events/api';
import {
  useCreateBookingMutation,
  useDeleteBookingMutation,
  useGetBookingsQuery,
} from '../../features/bookings/api';
import EventCard from '../../components/EventCard';
import TextInputField from '../../components/Forms/TextInputField';
import CATEGORIES from '../../constants/categories';
import CategorySelect from '../../components/Forms/CategorySelect';
import GooglePlacesAutocomplete from '../../components/Forms/GooglePlacesAutocomplete';
import DateTimePickerField from '../../components/Forms/DateTimePickerField';
import { addFavorite, removeFavorite } from '../../features/favorites';
import { useAddFavoriteMutation, useRemoveFavoriteMutation } from '../../features/favorites/api';

const SearchScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const bookings = useSelector((state) => state.bookings.list);
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const userId = useSelector((state) => state.auth.user?._id || state.auth.user?.id);
  const [addFavoriteApi] = useAddFavoriteMutation();
  const [removeFavoriteApi] = useRemoveFavoriteMutation();
  const [createBooking] = useCreateBookingMutation();
  const [cancelBooking] = useDeleteBookingMutation();
  useGetBookingsQuery({ userId }, { skip: !isAuthenticated, refetchOnMountOrArgChange: true });
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [cityInput, setCityInput] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeFrom, setSelectedTimeFrom] = useState(null);
  const [selectedTimeTo, setSelectedTimeTo] = useState(null);
  const { data: events = [], refetch, isFetching } = useListEventsQuery();
  const [refreshing, setRefreshing] = useState(false);
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
        if (isFav) {
          dispatch(addFavorite(eventId));
        } else {
          dispatch(removeFavorite(eventId));
        }
      }
    },
    [dispatch, addFavoriteApi, removeFavoriteApi, favoriteIds]
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const allowedCategories = useMemo(
    () => (CATEGORIES || []).filter((c) => c && c !== 'Inne'),
    []
  );

  const filteredEvents = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (events || []).filter((event) => {
      const eventDate = event.date ? new Date(event.date).getTime() : null;
      const isRecentEnough = eventDate ? eventDate >= cutoff : true;
      if (!isRecentEnough) return false;
      const normalizedQuery = query.toLowerCase();
      const matchesQuery =
        query === '' ||
        event.title?.toLowerCase().includes(normalizedQuery) ||
        (Array.isArray(event.categories)
          ? event.categories.some((c) => c?.toLowerCase?.().includes(normalizedQuery))
          : event.category?.toLowerCase?.().includes(normalizedQuery));
      const matchesCity =
        !selectedCity ||
        event.city?.toLowerCase?.().includes(selectedCity.toLowerCase());
      const eventDateObj = event.date ? new Date(event.date) : null;
      const matchesDate =
        !selectedDate ||
        (eventDateObj &&
          eventDateObj.getFullYear() === new Date(selectedDate).getFullYear() &&
          eventDateObj.getMonth() === new Date(selectedDate).getMonth() &&
          eventDateObj.getDate() === new Date(selectedDate).getDate());
      const matchesTime =
        (!selectedTimeFrom && !selectedTimeTo) ||
        (eventDateObj &&
          (() => {
            const evMins = eventDateObj.getHours() * 60 + eventDateObj.getMinutes();
            const fromMins = selectedTimeFrom
              ? new Date(selectedTimeFrom).getHours() * 60 +
                new Date(selectedTimeFrom).getMinutes()
              : -Infinity;
            const toMins = selectedTimeTo
              ? new Date(selectedTimeTo).getHours() * 60 +
                new Date(selectedTimeTo).getMinutes()
              : Infinity;
            return evMins >= fromMins && evMins <= toMins;
          })());
      const matchesCategory =
        !selectedCategories.length ||
        (Array.isArray(event.categories)
          ? event.categories.some((c) => selectedCategories.includes(c))
          : selectedCategories.includes(event.category));
      return matchesQuery && matchesCategory && matchesCity && matchesDate && matchesTime;
    });
  }, [events, query, selectedCategories, selectedCity, selectedDate, selectedTimeFrom, selectedTimeTo]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item._id || item.id || String(item)}
        ListHeaderComponentStyle={{ zIndex: 2000, elevation: 2000 }}
        style={{ zIndex: 0 }}
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
            <Text style={styles.title}>Szukaj aktywności</Text>
            <TextInputField
              label="Wyszukaj wydarzenie"
              placeholder="np. joga, wspinaczka"
              value={query}
              onChangeText={setQuery}
            />
            <CategorySelect
              label="Kategorie"
              value={selectedCategories}
              onSelect={setSelectedCategories}
              categories={allowedCategories}
              placeholder="Wybierz kategorie"
            />
            <View style={styles.cityField}>
              <GooglePlacesAutocomplete
                label="Miasto"
                value={cityInput}
                onChange={(text) => {
                  setCityInput(text);
                  if (!text) setSelectedCity('');
                }}
                onPlaceSelect={(place) => {
                  const cityName = place?.city || place?.description || '';
                  setCityInput(cityName);
                  setSelectedCity(cityName);
                }}
                placeholder="Wpisz miasto"
                type="cities"
              />
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateColWide}>
                <DateTimePickerField
                  label="Data"
                  mode="date"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="Wybierz datę"
                  minimumDate={undefined}
                />
                <TouchableOpacity
                  onPress={() => setSelectedDate(null)}
                  style={styles.clearBtnInline}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearText}>Wyczyść datę</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.dateCol}>
                <DateTimePickerField
                  label="Godzina od"
                  mode="time"
                  value={selectedTimeFrom}
                  onChange={setSelectedTimeFrom}
                  placeholder="Od"
                  minimumDate={undefined}
                />
              </View>
              <View style={styles.dateCol}>
                <DateTimePickerField
                  label="Godzina do"
                  mode="time"
                  value={selectedTimeTo}
                  onChange={setSelectedTimeTo}
                  placeholder="Do"
                  minimumDate={undefined}
                />
              </View>
            </View>
            <View style={styles.clearRowSingle}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedTimeFrom(null);
                  setSelectedTimeTo(null);
                }}
                style={styles.clearBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.clearText}>Wyczyść godzinę</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Nic nie znaleziono.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 16,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 0,
    position: 'relative',
    zIndex: 20,
    elevation: 0,
    shadowColor: 'transparent',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  cityField: {
    marginTop: 8,
    position: 'relative',
    zIndex: 30,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  dateCol: {
    flex: 1,
  },
  dateColWide: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearRowSingle: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: -6,
    marginBottom: 15,
  },
  clearBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
  },
  clearBtnInline: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 0,
    alignSelf: 'flex-start',
  },
  clearText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 0,
  },
  empty: {
    marginTop: 36,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
});

export default SearchScreen;

