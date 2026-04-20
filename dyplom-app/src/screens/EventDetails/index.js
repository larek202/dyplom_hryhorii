import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
  Linking,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { Colors } from '../../styles/colors';
import { addFavorite, removeFavorite } from '../../features/favorites';
import { useAddFavoriteMutation, useRemoveFavoriteMutation } from '../../features/favorites/api';
import { useGetEventQuery } from '../../features/events/api';
import { useCreateBookingMutation, useGetBookingsQuery, useDeleteBookingMutation } from '../../features/bookings/api';

const EventDetailsScreen = ({ route, navigation }) => {
  const { eventId } = route.params ?? {};
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const bookings = useSelector((state) => state.bookings.list);
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const userId = useSelector((state) => state.auth.user?._id || state.auth.user?.id);
  const dispatch = useDispatch();
  const [addFavoriteApi] = useAddFavoriteMutation();
  const [removeFavoriteApi] = useRemoveFavoriteMutation();
  const [createBooking] = useCreateBookingMutation();
  const [deleteBooking] = useDeleteBookingMutation();
  useGetBookingsQuery({ userId }, { skip: !isAuthenticated, refetchOnMountOrArgChange: true });
  
  // Используем API для получения события
  const { data: event, isLoading, error, refetch, isFetching } = useGetEventQuery(eventId);
  const [refreshing, setRefreshing] = React.useState(false);
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState(null);
  const baseScale = React.useRef(new Animated.Value(1)).current;
  const pinchScale = React.useRef(new Animated.Value(1)).current;
  const lastScale = React.useRef(1);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  const lastTranslate = React.useRef({ x: 0, y: 0 });
  const zoomScale = React.useMemo(
    () => Animated.multiply(baseScale, pinchScale),
    [baseScale, pinchScale]
  );
  const pinchRef = React.useRef(null);
  const panRef = React.useRef(null);
  const tapRef = React.useRef(null);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const heroImageWidth = screenWidth - 40;
  const fallbackImage = require('../../../assets/icon.png');
  const fallbackImageUri = Image.resolveAssetSource(fallbackImage).uri;

  const clamp = useCallback((value, min, max) => Math.min(Math.max(value, min), max), []);
  const clampTranslate = useCallback(
    (scale, nextX, nextY) => {
      const boundedScale = Math.max(1, scale || 1);
      const maxX = ((boundedScale - 1) * screenWidth) / 2 + screenWidth / 2;
      const maxY = ((boundedScale - 1) * screenHeight) / 2 + screenHeight / 2;
      return {
        x: clamp(nextX, -maxX, maxX),
        y: clamp(nextY, -maxY, maxY),
      };
    },
    [clamp, screenWidth, screenHeight]
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {}
    setRefreshing(false);
  }, [refetch]);

  const resetZoom = useCallback(() => {
    lastScale.current = 1;
    baseScale.setValue(1);
    pinchScale.setValue(1);
    lastTranslate.current = { x: 0, y: 0 };
    translateX.setOffset(0);
    translateY.setOffset(0);
    translateX.setValue(0);
    translateY.setValue(0);
  }, [baseScale, pinchScale, translateX, translateY]);

  const openViewer = useCallback(
    (uri) => {
      resetZoom();
      setViewerImage(uri);
      setViewerVisible(true);
    },
    [resetZoom]
  );

  const closeViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

  const handleOpenMaps = useCallback(() => {
    const addressParts = [
      event?.location?.address,
      event?.location?.postalCode,
      event?.city,
    ].filter(Boolean);
    const query = addressParts.join(', ');
    if (!query) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  }, [event]);
  
  const gallery = useMemo(() => {
    if (!event) return [];
    // Используем images из API, если есть, иначе используем image
    if (event.images && event.images.length > 0) {
      return event.images;
    }
    if (event.image) {
      return [event.image];
    }
    return [];
  }, [event]);

  const coverIdx = useMemo(() => {
    if (!gallery.length) return 0;
    let idx = Number(event?.coverImageIndex);
    if (!Number.isFinite(idx) || idx < 0) idx = 0;
    return Math.min(Math.floor(idx), gallery.length - 1);
  }, [event?.coverImageIndex, gallery]);

  const onPinchGestureEvent = React.useMemo(
    () => Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true }),
    [pinchScale]
  );

  const onPinchStateChange = useCallback(
    ({ nativeEvent }) => {
      if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
        const nextScale = Math.max(1, Math.min(3, lastScale.current * nativeEvent.scale));
        lastScale.current = nextScale;
        baseScale.setValue(nextScale);
        pinchScale.setValue(1);
        const clamped = clampTranslate(nextScale, lastTranslate.current.x, lastTranslate.current.y);
        lastTranslate.current = clamped;
        translateX.setOffset(clamped.x);
        translateY.setOffset(clamped.y);
        translateX.setValue(0);
        translateY.setValue(0);
      }
    },
    [baseScale, pinchScale, clampTranslate, translateX, translateY]
  );

  const onPanGestureEvent = React.useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
        { useNativeDriver: true }
      ),
    [translateX, translateY]
  );

  const onPanStateChange = useCallback(
    ({ nativeEvent }) => {
      if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
        const nextX = lastTranslate.current.x + nativeEvent.translationX;
        const nextY = lastTranslate.current.y + nativeEvent.translationY;
        const clamped = clampTranslate(lastScale.current, nextX, nextY);
        lastTranslate.current = clamped;
        translateX.setOffset(clamped.x);
        translateY.setOffset(clamped.y);
        translateX.setValue(0);
        translateY.setValue(0);
      }
    },
    [clampTranslate, translateX, translateY]
  );

  const onDoubleTap = useCallback(
    (tapX, tapY) => {
      const nextScale = lastScale.current > 1 ? 1 : 2;
      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;
      const deltaX = (centerX - tapX) * (nextScale - 1);
      const deltaY = (centerY - tapY) * (nextScale - 1);
      lastScale.current = nextScale;
      baseScale.setValue(nextScale);
      pinchScale.setValue(1);
      const clamped = clampTranslate(nextScale, deltaX, deltaY);
      lastTranslate.current = clamped;
      translateX.setOffset(clamped.x);
      translateY.setOffset(clamped.y);
      translateX.setValue(0);
      translateY.setValue(0);
    },
    [baseScale, pinchScale, clampTranslate, translateX, translateY, screenWidth, screenHeight]
  );

  const normalizeId = useCallback((v) => (v?._id || v?.id || v)?.toString?.() ?? '', []);
  const eventIdForFavorites = normalizeId(event?._id || event?.id || eventId);
  const isFavorite = favoriteIds.includes(eventIdForFavorites);
  const categories = useMemo(() => {
    if (!event) return [];
    const source =
      Array.isArray(event.categories) && event.categories.length > 0
        ? event.categories
        : event.category
        ? [event.category]
        : [];
    const tags = Array.isArray(event.tags) ? event.tags : [];
    const merged = [...source, ...tags];
    const normalized = merged
      .map((category) => {
        if (typeof category === 'string') return category;
        if (typeof category === 'number') return String(category);
        return category?.name || category?.title || category?.label || '';
      })
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }, [event]);
  const organizerName = useMemo(() => event?.organizationName || '', [event]);
  const addressMain = event?.location?.address || '';
  const addressSub = [event?.city, event?.location?.postalCode].filter(Boolean).join(', ');
  const organizerInfo = useMemo(() => {
    if (event?.organization) return event.organization;
    if (event?.organizationName) {
      return { name: event.organizationName };
    }
    return null;
  }, [event]);
  const handleOpenOrganizer = useCallback(() => {
    if (!organizerInfo) return;
    navigation.navigate('OrganizerInfo', { organizer: organizerInfo });
  }, [navigation, organizerInfo]);

  const toggleFavorite = useCallback(async () => {
    if (!eventIdForFavorites) return;
    const currentlyFav = favoriteIds.includes(eventIdForFavorites);
    try {
      if (currentlyFav) {
        dispatch(removeFavorite(eventIdForFavorites));
        await removeFavoriteApi(eventIdForFavorites);
      } else {
        dispatch(addFavorite(eventIdForFavorites));
        await addFavoriteApi(eventIdForFavorites);
      }
    } catch {
      // rollback on failure
      if (currentlyFav) {
        dispatch(addFavorite(eventIdForFavorites));
      } else {
        dispatch(removeFavorite(eventIdForFavorites));
      }
    }
  }, [eventIdForFavorites, favoriteIds, dispatch, addFavoriteApi, removeFavoriteApi]);

  const bookingsList = bookings;
  const bookedSet = useMemo(
    () => new Set((bookingsList || []).map((b) => normalizeId(b.eventId))),
    [bookingsList, normalizeId]
  );

  const isBooked = bookedSet.has(eventIdForFavorites);

  const handleBooking = useCallback(async () => {
    if (!eventIdForFavorites) return;
    try {
      if (isBooked) {
        await deleteBooking({ eventId: eventIdForFavorites }).unwrap();
      } else {
        await createBooking({ eventId: eventIdForFavorites }).unwrap();
      }
    } catch (e) {
      console.warn('Booking toggle failed', e);
    }
  }, [isBooked, deleteBooking, createBooking, eventIdForFavorites]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Ładowanie...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nie znaleziono wydarzenia.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.container}>
          <View style={styles.heroCard}>
            {gallery.length > 1 ? (
              <FlatList
                data={gallery}
                horizontal
                pagingEnabled
                snapToInterval={heroImageWidth}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={coverIdx}
                getItemLayout={(_, index) => ({
                  length: heroImageWidth,
                  offset: heroImageWidth * index,
                  index,
                })}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openViewer(item || fallbackImageUri)}
                    style={{ width: heroImageWidth }}
                  >
                    <Image
                      source={item ? { uri: item } : fallbackImage}
                      style={[styles.heroImage, { width: heroImageWidth }]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openViewer(gallery[coverIdx] || fallbackImageUri)}
                style={{ width: heroImageWidth }}
              >
                <Image
                  source={gallery[coverIdx] ? { uri: gallery[coverIdx] } : fallbackImage}
                  style={[styles.heroImage, { width: heroImageWidth }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.heartBadge} onPress={toggleFavorite}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? Colors.danger : Colors.primary}
              />
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <Text style={styles.title}>{event.title}</Text>
              {categories.length > 0 ? (
                <View style={styles.categoryRow}>
                  {categories.map((cat) => (
                    <View key={cat} style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {(addressMain || addressSub) ? (
            <TouchableOpacity style={styles.locationCard} onPress={handleOpenMaps} activeOpacity={0.8}>
              <Ionicons name="location-outline" size={22} color={Colors.primary} />
              <View style={styles.locationText}>
                <Text style={styles.locationMain}>{addressMain || addressSub}</Text>
                {addressMain && addressSub ? (
                  <Text style={styles.locationSub}>{addressSub}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.detailsCard}>
            <View style={styles.detailsRow}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={styles.detailsText}>
                {event.date
                  ? new Date(event.date).toLocaleString('pl-PL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  : 'Nie określono'}
              </Text>
            </View>
            {event.maxParticipants ? (
              <View style={styles.detailsRow}>
                <Ionicons name="people-outline" size={20} color={Colors.primary} />
                <Text style={styles.detailsText}>Maks. {event.maxParticipants} uczestników</Text>
              </View>
            ) : null}
            <View style={styles.detailsDivider} />
            {organizerName ? (
              <TouchableOpacity style={styles.detailsRow} onPress={handleOpenOrganizer} activeOpacity={0.7}>
                <Ionicons name="pricetag-outline" size={20} color={Colors.primary} />
                <Text style={styles.detailsText}>Organizer: {organizerName}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {event.description ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionTitle}>Opis</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={[styles.bookButton, isBooked && styles.bookedButton]} onPress={handleBooking}>
          <Text style={[styles.bookButtonText, isBooked && styles.bookedButtonText]}>
            {isBooked ? 'Zarezerwowane' : 'Rezerwuj'}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <GestureHandlerRootView style={styles.viewerRoot}>
          <View style={[styles.viewerSafeArea, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={[styles.viewerClose, { top: insets.top + 8 }]}
              onPress={closeViewer}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color={Colors.surface} />
            </TouchableOpacity>
            <PanGestureHandler
              ref={panRef}
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanStateChange}
              simultaneousHandlers={[pinchRef, tapRef]}
            >
              <Animated.View style={styles.viewerGestureArea}>
                <TapGestureHandler
                  ref={tapRef}
                  numberOfTaps={2}
                  onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.END) {
                      onDoubleTap(nativeEvent.x, nativeEvent.y);
                    }
                  }}
                  simultaneousHandlers={[panRef, pinchRef]}
                >
                  <Animated.View style={styles.viewerTapArea}>
                    <PinchGestureHandler
                      ref={pinchRef}
                      onGestureEvent={onPinchGestureEvent}
                      onHandlerStateChange={onPinchStateChange}
                      simultaneousHandlers={[panRef, tapRef]}
                    >
                      <Animated.View style={styles.viewerImageWrap} collapsable={false}>
                        <Animated.Image
                          source={{ uri: viewerImage || fallbackImageUri }}
                          style={[
                            styles.viewerImage,
                            { transform: [{ translateX }, { translateY }, { scale: zoomScale }] },
                          ]}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    </PinchGestureHandler>
                  </Animated.View>
                </TapGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  container: {
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.border,
  },
  heartBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  locationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
  },
  locationMain: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  locationSub: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  description: {
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 0,
  },
  descriptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailsText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginLeft: 10,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bookButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  bookedButton: {
    backgroundColor: Colors.primary + '22', // лёгкое осветление того же цвета
  },
  bookButtonText: {
    color: Colors.surface,
    fontWeight: '700',
  },
  bookedButtonText: {
    color: Colors.textPrimary,
  },
  viewerRoot: {
    flex: 1,
  },
  viewerSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(7, 12, 24, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  viewerGestureArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTapArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  viewerImageWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    elevation: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 18,
    padding: 6,
  },
});

export default EventDetailsScreen;