import React, { useMemo, useState, useCallback } from 'react';
import { getEventCoverImageUri } from '../../utils/eventCoverImage';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/colors';
import EventCard from '../../components/EventCard';
import { useListEventsQuery } from '../../features/events/api';
import { useGetBookingsQuery, useDeleteBookingMutation } from '../../features/bookings/api';
import { addFavorite, removeFavorite } from '../../features/favorites';
import { useAddFavoriteMutation, useRemoveFavoriteMutation } from '../../features/favorites/api';

const BookingScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const bookings = useSelector((state) => state.bookings.list);
  const eventsFromStore = useSelector((state) => state.events.list);
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const [addFavoriteApi] = useAddFavoriteMutation();
  const [removeFavoriteApi] = useRemoveFavoriteMutation();
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const userId = useSelector((state) => state.auth.user?._id || state.auth.user?.id);
  const { data: bookingsData, refetch: refetchBookings, isFetching: isFetchingBookings } = useGetBookingsQuery(
    { userId },
    { skip: !isAuthenticated, refetchOnMountOrArgChange: true }
  );
  const [cancelBooking] = useDeleteBookingMutation();

  const bookingsList = Array.isArray(bookingsData?.bookings)
    ? bookingsData.bookings
    : Array.isArray(bookingsData)
      ? bookingsData
      : bookings;

  const { data: eventsData, refetch: refetchEvents, isFetching: isFetchingEvents } = useListEventsQuery();
  const events = Array.isArray(eventsData) ? eventsData : eventsFromStore;

  const enriched = useMemo(() => {
    const now = Date.now();
    return bookingsList
      .map((booking) => {
        const event =
          events.find((e) => (e._id || e.id) === booking.eventId) ||
          booking.event ||
          null;
        if (!event) return null;
        const isPast = event.date ? new Date(event.date).getTime() < now : false;
        return {
          ...booking,
          event,
          isPast,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.isPast !== b.isPast) {
          return a.isPast ? 1 : -1;
        }
        const aTime = a.event?.date ? new Date(a.event.date).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.event?.date ? new Date(b.event.date).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [bookingsList, events]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchBookings()]);
    setRefreshing(false);
  }, [refetchEvents, refetchBookings]);

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

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Moje rezerwacje</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={enriched}
        keyExtractor={(item) => item._id || item.id || item.eventId}
        renderItem={({ item }) => {
          const eventId = item.event?._id || item.event?.id;
          const coverUri = getEventCoverImageUri(item.event);
          return (
            <TouchableOpacity
              style={[styles.bookingCard, item.isPast && styles.bookingCardPast]}
              onPress={() => navigation.navigate('EventDetails', { eventId })}
              activeOpacity={0.85}
            >
              {coverUri ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: coverUri }}
                    style={styles.eventImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.favoriteToggle}
                    onPress={() => toggleFavorite(eventId)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={favoriteIds.includes(eventId) ? 'heart' : 'heart-outline'}
                      size={22}
                      color={favoriteIds.includes(eventId) ? Colors.danger : Colors.surface}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.favoriteToggle}
                  onPress={() => toggleFavorite(eventId)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={favoriteIds.includes(eventId) ? 'heart' : 'heart-outline'}
                    size={22}
                    color={favoriteIds.includes(eventId) ? Colors.accent : Colors.surface}
                  />
                </TouchableOpacity>
              )}
            <View style={styles.metaRow}>
              <Text style={styles.eventCategories}>
                {(() => {
                  const categories = Array.isArray(item.event.categories) && item.event.categories.length > 0
                    ? item.event.categories.filter(Boolean)
                    : item.event.category
                      ? [item.event.category]
                      : [];
                  const visible = categories.slice(0, 2);
                  return visible.length
                    ? `${visible.join(', ')}${categories.length > 2 ? ' +' : ''}`
                    : '';
                })()}
              </Text>
            </View>
            <Text style={styles.eventTitle}>{item.event.title}</Text>
            <Text style={styles.eventCity}>{item.event.city || ''}</Text>
            <Text style={styles.eventMeta}>
              {item.event.date
                ? `${new Date(item.event.date).toLocaleDateString('pl-PL')} • ${new Date(
                    item.event.date
                  ).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                : '—'}
            </Text>
            <Text style={styles.status}>
              {item.isPast ? 'Zrealizowane' : 'Zaplanowane'}
            </Text>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<Text style={styles.empty}>Brak aktywnych rezerwacji.</Text>}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isFetchingEvents || isFetchingBookings}
            onRefresh={onRefresh}
          />
        }
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  bookingCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  favoriteToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15,23,42,0.6)',
    padding: 6,
    borderRadius: 20,
    zIndex: 2,
  },
  eventImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.border,
  },
  bookingCardPast: {
    backgroundColor: Colors.surface,
    opacity: 0.55,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventCategories: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  eventCity: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  eventMeta: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  status: {
    marginTop: 8,
    fontWeight: '600',
    color: Colors.primary,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 32,
  },
});

export default BookingScreen;

