import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Colors } from '../../styles/colors';
import EventCard from '../../components/EventCard';
import { addFavorite, removeFavorite } from '../../features/favorites';
import { useRemoveFavoriteMutation } from '../../features/favorites/api';
import { useListEventsQuery } from '../../features/events/api';
import { useDeleteBookingMutation, useGetBookingsQuery } from '../../features/bookings/api';

const FavoritesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const bookings = useSelector((state) => state.bookings.list);
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const userId = useSelector((state) => state.auth.user?._id || state.auth.user?.id);
  const normalizeId = useCallback((v) => (v?._id || v?.id || v)?.toString?.() ?? '', []);
  useGetBookingsQuery({ userId }, { skip: !isAuthenticated, refetchOnMountOrArgChange: true });
  const bookingsList = bookings;
  const bookedSet = useMemo(
    () => new Set((bookingsList || []).map((b) => normalizeId(b.eventId))),
    [bookingsList, normalizeId]
  );
  const [cancelBooking] = useDeleteBookingMutation();
  const [removeFavoriteApi] = useRemoveFavoriteMutation();
  const { data: events = [], refetch, isFetching } = useListEventsQuery();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);
  const favorites = useMemo(() => {
    return events
      .filter((event) => {
        const eventId = event._id || event.id;
        return favoriteIds.includes(eventId);
      })
      .sort((a, b) => {
        const aPast = a.date ? new Date(a.date).getTime() < Date.now() : false;
        const bPast = b.date ? new Date(b.date).getTime() < Date.now() : false;
        if (aPast !== bPast) {
          return aPast ? 1 : -1;
        }
        const aTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [events, favoriteIds]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Ulubione aktywności</Text>
        <FlatList
          data={favorites}
          keyExtractor={(item) => item._id || item.id || String(item)}
          renderItem={({ item }) => {
            const eventId = item._id || item.id;
            const isPast = item.date ? new Date(item.date).getTime() < Date.now() : false;
            return (
              <View style={isPast ? styles.pastCard : null}>
                <EventCard
                  item={item}
                  onPress={() => navigation.navigate('EventDetails', { eventId })}
                  isFavorite
                  onFavoriteToggle={async () => {
                    dispatch(removeFavorite(eventId));
                    try {
                      await removeFavoriteApi(eventId);
                    } catch {
                      dispatch(addFavorite(eventId));
                    }
                  }}
                  bookingState={
                    bookedSet.has(normalizeId(eventId))
                      ? 'booked'
                      : 'free'
                  }
                  onBook={async () => {
                    const already = bookedSet.has(normalizeId(eventId));
                    try {
                      if (already) {
                        await cancelBooking({ eventId }).unwrap();
                      } else {
                        // no-op here (favorites screen), but could add createBooking if needed
                      }
                    } catch (e) {
                      // ignore
                    }
                  }}
                />
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Nie dodałeś jeszcze ulubionych wydarzeń.</Text>}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />
          }
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
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  pastCard: {
    opacity: 0.55,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 32,
  },
});

export default FavoritesScreen;




