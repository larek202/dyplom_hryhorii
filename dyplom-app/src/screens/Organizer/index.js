import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useListEventsQuery } from '../../features/events/api';
import { useGetBookingsQuery } from '../../features/bookings/api';
import { useGetFavoritesCountsQuery } from '../../features/favorites/api';
import { useGetOrganizerProfileQuery } from '../../features/organizer/api';
import { Colors } from '../../styles/colors';

const OrganizerScreen = () => {
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const {
    data,
    isLoading: isLoadingEvents,
    refetch,
  } = useListEventsQuery(
    { organizerId: user?._id || user?.id, limit: 100 },
    { skip: !user }
  );
  const { data: organizerProfileData } = useGetOrganizerProfileQuery(undefined, { skip: !user });
  const organizerProfile = useMemo(
    () =>
      organizerProfileData?.organization ||
      organizerProfileData?.organizer ||
      organizerProfileData?.profile ||
      organizerProfileData ||
      {},
    [organizerProfileData]
  );
  const organizerAddress = useMemo(() => {
    if (!organizerProfile?.address) return '';
    if (typeof organizerProfile.address === 'string') return organizerProfile.address;
    const { street, city: addressCity, zipCode, country } = organizerProfile.address || {};
    return [street, addressCity, zipCode, country].filter(Boolean).join(', ');
  }, [organizerProfile]);

  // Нормализуем ответ API и фильтруем строго по организатору на клиенте,
  // если backend вдруг не применил фильтр.
  const allEvents = Array.isArray(data) ? data : data?.events || [];
  const organizerId = user?._id || user?.id;
  const events = allEvents.filter((evt) => {
    if (!organizerId) return false;
    const evtOrg = evt.organizerId;
    if (typeof evtOrg === 'string') return evtOrg === organizerId;
    if (evtOrg && typeof evtOrg === 'object') {
      return evtOrg._id === organizerId || evtOrg.id === organizerId;
    }
    return false;
  });
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // При возвращении на экран — обновляем данные, чтобы не зависал pull-to-refresh
  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const eventIds = useMemo(
    () => events.map((event) => event._id || event.id).filter(Boolean),
    [events]
  );
  const eventIdsStrings = useMemo(
    () => eventIds.map((id) => (id?.toString?.() ? id.toString() : id)).filter(Boolean),
    [eventIds]
  );

  const { data: organizerBookingsData } = useGetBookingsQuery(
    { userId: user?._id || user?.id, organizerId: user?._id || user?.id },
    { skip: !user, refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true }
  );
  const organizerBookings = useMemo(
    () =>
      Array.isArray(organizerBookingsData)
        ? organizerBookingsData
        : organizerBookingsData?.bookings || [],
    [organizerBookingsData]
  );

  const bookingCountByEvent = useMemo(() => {
    const counts = {};
    organizerBookings.forEach((b) => {
      const evId = b.eventId?._id || b.eventId;
      const seats = b.seats || 1;
      if (!evId) return;
      counts[evId] = (counts[evId] || 0) + seats;
    });
    return counts;
  }, [organizerBookings]);

  const {
    data: favoriteCountsData,
  } = useGetFavoritesCountsQuery(
    { organizerId, eventIds: eventIdsStrings },
    {
      skip: !user || !organizerId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const favoriteCountsFromServer = useMemo(
    () => favoriteCountsData?.counts || {},
    [favoriteCountsData]
  );

  const stats = useMemo(() => {
    const bookingCount = organizerBookings.filter((booking) => {
      const bid = (booking.eventId?._id || booking.eventId || '').toString();
      return eventIdsStrings.includes(bid);
    }).length;
    const favoriteCount = eventIdsStrings.reduce(
      (acc, id) => acc + (favoriteCountsFromServer[id] || 0),
      0
    );
    return {
      bookings: bookingCount,
      favorites: favoriteCount,
    };
  }, [organizerBookings, eventIdsStrings, favoriteCountsFromServer]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Panel organizatora</Text>
      <View style={styles.organizerCard}>
        <View style={styles.organizerHeader}>
          {organizerProfile.logoUrl ? (
            <Image source={{ uri: organizerProfile.logoUrl }} style={styles.organizerLogo} />
          ) : null}
          <View style={styles.organizerHeaderText}>
            <Text style={styles.organizerName}>
              {organizerProfile.name || 'Organizator'}
            </Text>
            {organizerProfile.city ? (
              <Text style={styles.organizerCity}>{organizerProfile.city}</Text>
            ) : null}
          </View>
        </View>
        {organizerProfile.description ? (
          <Text style={styles.organizerDescription}>{organizerProfile.description}</Text>
        ) : null}
        {[
          { label: 'Adres', value: organizerAddress },
          { label: 'E-mail', value: organizerProfile.contactEmail },
          { label: 'Telefon', value: organizerProfile.contactPhone },
          { label: 'Strona', value: organizerProfile.website },
          { label: 'Facebook', value: organizerProfile.facebook },
          { label: 'Instagram', value: organizerProfile.instagram },
        ]
          .filter((item) => item.value)
          .map((item) => (
            <View key={item.label} style={styles.organizerRow}>
              <Text style={styles.organizerLabel}>{item.label}</Text>
              <Text style={styles.organizerValue} numberOfLines={1}>
                {item.value}
              </Text>
            </View>
          ))}
        <TouchableOpacity
          style={styles.organizerEditButton}
          onPress={() => navigation.navigate('BecomeOrganizer', { mode: 'edit' })}
        >
          <Text style={styles.organizerEditText}>Edytuj dane organizatora</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Rezerwacje</Text>
          <Text style={styles.statValue}>{stats.bookings}</Text>
          <Text style={styles.statHint}>Wszystkie rezerwacje dla Twoich wydarzeń</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Ulubione</Text>
          <Text style={styles.statValue}>{stats.favorites}</Text>
          <Text style={styles.statHint}>Dodane wydarzenia do ulubionych przez użytkowników</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Twoje wydarzenia</Text>
      <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateEvent')}>
        <Text style={styles.createButtonText}>Dodaj wydarzenie</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={isLoadingEvents ? [] : events}
        keyExtractor={(item) => item._id || item.id}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.eventCity}>{item.city || item.location?.city || '—'}</Text>
            </View>
            <Text style={styles.eventDate}>
              {item.date ? new Date(item.date).toLocaleDateString('pl-PL') : 'Data nieokreślona'}
            </Text>
            <View style={styles.eventMetaRow}>
              <Text style={styles.eventMeta}>
                Uczestników: {bookingCountByEvent[item._id || item.id] ?? 0}/{item.maxParticipants ?? item.slots ?? 0}
              </Text>
              <Text style={styles.eventMeta}>
                Polubienia: {favoriteCountsFromServer[(item._id || item.id || '').toString()] ?? 0}
              </Text>
            </View>
            <View style={styles.eventActions}>
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() =>
                  navigation.navigate('EventDetails', {
                    eventId: item._id || item.id,
                  })
                }
              >
                <Text style={styles.detailButtonText}>Zobacz szczegóły</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('CreateEvent', { event: item })}
              >
                <Text style={styles.editButtonText}>Edytuj</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListHeaderComponent={
          isLoadingEvents ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : (
            renderHeader()
          )
        }
        ListEmptyComponent={
          !isLoadingEvents ? (
            <Text style={styles.empty}>Nie dodałeś jeszcze żadnych wydarzeń.</Text>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoadingEvents} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  organizerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  organizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  organizerHeaderText: {
    flex: 1,
  },
  organizerLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: Colors.border,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  organizerCity: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  organizerDescription: {
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  organizerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  organizerLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  organizerValue: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
    textAlign: 'right',
  },
  organizerEditButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  organizerEditText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  statLabel: {
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statHint: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.textPrimary,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: Colors.surface,
    fontWeight: '700',
  },
  eventCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventCity: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  eventMeta: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  eventMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  detailButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  detailButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  loader: {
    marginTop: 24,
  },
});

export default OrganizerScreen;