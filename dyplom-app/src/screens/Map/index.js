import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleMaps, AppleMaps } from 'expo-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Colors } from '../../styles/colors';
import { useListEventsQuery } from '../../features/events/api';
import GooglePlacesAutocomplete from '../../components/Forms/GooglePlacesAutocomplete';

const normalizeId = (event) => String(event?._id || event?.id || '');

const MapScreen = () => {
  const MapView = Platform.OS === 'android' ? GoogleMaps?.View : AppleMaps?.View;
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const eventsFromStore = useSelector((state) => state.events.list || []);
  const { data: asyncEvents, refetch, isFetching } = useListEventsQuery();
  const events = asyncEvents ?? eventsFromStore;

  const [cityInput, setCityInput] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showList, setShowList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [mapCamera, setMapCamera] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isMapTouching, setIsMapTouching] = useState(false);
  const filteredEvents = useMemo(() => {
    const rawCity = (cityFilter || cityInput).trim();
    const city = rawCity.split(',')[0].trim().toLowerCase();
    return events.filter((event) =>
      city ? (event.city || '').toLowerCase().includes(city) : true
    );
  }, [events, cityFilter, cityInput]);

  const eventsWithCoords = useMemo(
    () =>
      filteredEvents
        .map((event) => {
          const latitude = Number(event?.location?.latitude);
          const longitude = Number(event?.location?.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
          }
          return { ...event, _coords: { latitude, longitude } };
        })
        .filter(Boolean),
    [filteredEvents]
  );

  const visibleEvents = useMemo(() => {
    if (!mapCamera || !mapSize.width || !mapSize.height) {
      return eventsWithCoords;
    }
    const { latitude, longitude } = mapCamera.coordinates || {};
    const zoom = mapCamera.zoom ?? 11;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return eventsWithCoords;
    }
    const latRad = (latitude * Math.PI) / 180;
    const metersPerPixel = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
    const halfWidthMeters = (mapSize.width / 2) * metersPerPixel;
    const halfHeightMeters = (mapSize.height / 2) * metersPerPixel;
    const latDelta = halfHeightMeters / 111320;
    const lonDelta = halfWidthMeters / (111320 * Math.cos(latRad || 1));
    return eventsWithCoords.filter((event) => {
      const { latitude: evLat, longitude: evLng } = event._coords;
      return (
        evLat >= latitude - latDelta &&
        evLat <= latitude + latDelta &&
        evLng >= longitude - lonDelta &&
        evLng <= longitude + lonDelta
      );
    });
  }, [eventsWithCoords, mapCamera, mapSize]);

  const calloutPosition = useMemo(() => {
    if (!selectedEvent || !mapCamera || !mapSize.width || !mapSize.height) {
      return null;
    }
    const { latitude, longitude } = selectedEvent._coords || {};
    const center = mapCamera.coordinates || {};
    const zoom = mapCamera.zoom ?? 11;
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(center.latitude) ||
      !Number.isFinite(center.longitude)
    ) {
      return null;
    }
    const worldSize = 256 * Math.pow(2, zoom);
    const project = (lat, lng) => {
      const sin = Math.sin((lat * Math.PI) / 180);
      const x = ((lng + 180) / 360) * worldSize;
      const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
      return { x, y };
    };
    const centerPx = project(center.latitude, center.longitude);
    const pointPx = project(latitude, longitude);
    const dx = pointPx.x - centerPx.x;
    const dy = pointPx.y - centerPx.y;
    const screenX = mapSize.width / 2 + dx;
    const screenY = mapSize.height / 2 + dy;
    const calloutWidth = 160;
    const calloutHeight = 64;
    const padding = 8;
    const left = Math.max(
      padding,
      Math.min(screenX - calloutWidth / 2, mapSize.width - calloutWidth - padding)
    );
    const top = Math.max(padding, screenY - calloutHeight - 48);
    return { left, top, width: calloutWidth };
  }, [mapCamera, mapSize, selectedEvent]);

  const eventLookup = useMemo(() => {
    return visibleEvents.reduce((acc, event) => {
      acc[normalizeId(event)] = event;
      return acc;
    }, {});
  }, [visibleEvents]);

  const eventMarkers = useMemo(
    () =>
      visibleEvents.map((event) => ({
        id: normalizeId(event),
        coordinates: event._coords,
        showCallout: false,
      })),
    [visibleEvents]
  );

  /** quick: tylko ostatnia znana pozycja (szybko); full: dopiero GPS jeśli brak cache (wolniejsze). */
  const resolveUserLocation = useCallback(async (mode) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Brak dostępu do lokalizacji.');
        return null;
      }
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 30 * 60 * 1000,
      });
      if (lastKnown?.coords) {
        const coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        setUserLocation(coords);
        setLocationError('');
        return coords;
      }
      if (mode === 'quick') {
        return null;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(coords);
      setLocationError('');
      return coords;
    } catch (error) {
      setLocationError('Nie udało się pobrać lokalizacji.');
      return null;
    }
  }, []);

  const promptEnableLocation = useCallback(() => {
    Alert.alert(
      'Włącz lokalizację',
      'Aby skorzystać z tej funkcji, włącz dostęp do lokalizacji w ustawieniach telefonu.',
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Ustawienia', onPress: () => Linking.openSettings() },
      ]
    );
  }, []);

  useEffect(() => {
    void resolveUserLocation('quick');
  }, [resolveUserLocation]);

  const initialCameraPosition = useMemo(() => {
    const fallbackCoordinates = eventsWithCoords[0]?.location
      ? {
          latitude: eventsWithCoords[0].location.latitude,
          longitude: eventsWithCoords[0].location.longitude,
        }
      : { latitude: 52.2297, longitude: 21.0122 };
    return {
      coordinates: fallbackCoordinates,
      zoom: 11,
    };
  }, [eventsWithCoords]);

  const mapUiSettings = useMemo(
    () =>
      Platform.OS === 'android'
        ? {
            zoomControlsEnabled: false,
            myLocationButtonEnabled: false,
            mapToolbarEnabled: false,
          }
        : {
            myLocationButtonEnabled: false,
          },
    []
  );

  useEffect(() => {
    if (!userLocation || !mapRef.current?.setCameraPosition) return;
    mapRef.current.setCameraPosition({
      coordinates: userLocation,
      zoom: 12,
      duration: 600,
    });
    setMapCamera({ coordinates: userLocation, zoom: 12 });
  }, [userLocation]);

  const handleOpenDetails = useCallback(
    (eventId) => navigation.navigate('EventDetails', { eventId }),
    [navigation]
  );

  const handleCenterOnUser = useCallback(async () => {
    const coords = userLocation || (await resolveUserLocation('full'));
    if (!coords) {
      promptEnableLocation();
      return;
    }
    if (!mapRef.current?.setCameraPosition) return;
    mapRef.current.setCameraPosition({
      coordinates: coords,
      zoom: 12,
      duration: 600,
    });
    setMapCamera({ coordinates: coords, zoom: 12 });
  }, [resolveUserLocation, promptEnableLocation, userLocation]);

  const mapIsAvailable = !!MapView;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isFetching}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            enabled={!isMapTouching}
          />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isMapTouching}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Mapa wydarzeń</Text>
            <Text style={styles.subtitle}>Odkrywaj aktywności w okolicy</Text>
            {locationError ? (
              <Text style={styles.locationError}>{locationError}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.filters}>
          <GooglePlacesAutocomplete
            label="Miasto"
            value={cityInput}
            onChange={(text) => {
              setCityInput(text);
              if (cityFilter) {
                setCityFilter('');
              }
            }}
            placeholder="Wpisz miasto"
            type="cities"
            disableValidation={true}
            onPlaceSelect={(place) => {
              const rawDescription = place?.description || '';
              const cityLabel =
                place?.city || (rawDescription ? rawDescription.split(',')[0].trim() : '');
              setCityInput(cityLabel);
              setCityFilter(cityLabel);
              if (place?.location && mapRef.current?.setCameraPosition) {
                const coords = {
                  latitude: place.location.lat,
                  longitude: place.location.lng,
                };
                mapRef.current.setCameraPosition({
                  coordinates: coords,
                  zoom: 12,
                  duration: 500,
                });
                setMapCamera({ coordinates: coords, zoom: 12 });
              }
            }}
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowList((prev) => !prev)}
          >
            <Ionicons name={showList ? 'map-outline' : 'list-outline'} size={16} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>
              {showList ? 'Pokaż tylko mapę' : 'Pokaż listę'}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.mapWrapper}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setMapSize({ width, height });
          }}
          onTouchStart={() => setIsMapTouching(true)}
          onTouchMove={() => setIsMapTouching(true)}
          onTouchEnd={() => setIsMapTouching(false)}
          onTouchCancel={() => setIsMapTouching(false)}
        >
        {mapIsAvailable ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            cameraPosition={initialCameraPosition}
            uiSettings={mapUiSettings}
            markers={eventMarkers}
            onMarkerClick={(marker) => {
              const event = marker?.id ? eventLookup[marker.id] : null;
              if (event) {
                const zoom = Math.min((mapCamera?.zoom ?? 11) + 1, 18);
                mapRef.current?.setCameraPosition?.({
                  coordinates: event._coords,
                  zoom,
                  duration: 400,
                });
                setMapCamera({ coordinates: event._coords, zoom });
                setSelectedEvent(event);
              }
            }}
            onMapClick={() => setSelectedEvent(null)}
            onCameraMove={(event) => {
              if (event?.coordinates) {
                setMapCamera({
                  coordinates: event.coordinates,
                  zoom: event.zoom,
                });
              }
            }}
          />
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.fallbackTitle}>Mapa wymaga modułu expo-maps</Text>
            <Text style={styles.fallbackText}>
              Zainstaluj build z expo-maps (npx expo prebuild --clean && npx expo run:android) i
              uruchom przez dev-client.
            </Text>
          </View>
        )}

        {selectedEvent ? (
          <View
            style={[
              styles.mapCallout,
              calloutPosition ? { left: calloutPosition.left, top: calloutPosition.top } : null,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.mapCalloutButton,
                calloutPosition ? { width: calloutPosition.width } : null,
              ]}
              onPress={() => handleOpenDetails(normalizeId(selectedEvent))}
            >
              <Text style={styles.mapCalloutTitle} numberOfLines={2}>
                {selectedEvent.title}
              </Text>
              {(() => {
                const raw =
                  Array.isArray(selectedEvent.categories) && selectedEvent.categories.length
                    ? selectedEvent.categories
                    : typeof selectedEvent.categories === 'string'
                    ? selectedEvent.categories.split(',')
                    : selectedEvent.category
                    ? [selectedEvent.category]
                    : [];
                const categories = raw.map((item) => String(item).trim()).filter(Boolean);
                if (!categories.length) return null;
                const visible = categories.slice(0, 2);
                const extra = categories.length - visible.length;
                const label = extra > 0 ? `${visible.join(', ')} +${extra}` : visible.join(', ');
                return (
                  <Text style={styles.mapCalloutMeta} numberOfLines={1}>
                    {label}
                  </Text>
                );
              })()}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.mapOverlayBottom}>
          <TouchableOpacity style={styles.overlayIconButton} onPress={handleCenterOnUser}>
            <Ionicons name="navigate-outline" size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        </View>

        {showList && (
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Wydarzenia w widoku</Text>
                <Text style={styles.sheetMeta}>
                  {visibleEvents.length} {visibleEvents.length === 1 ? 'pozycja' : 'pozycji'}
                </Text>
              </View>
            </View>

            <FlatList
              data={visibleEvents}
              keyExtractor={(item) => normalizeId(item)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => handleOpenDetails(normalizeId(item))}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                  </View>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.cardMetaText} numberOfLines={1}>
                      {item.city}
                    </Text>
                  </View>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.cardMetaText} numberOfLines={1}>
                      {item.date
                        ? new Date(item.date).toLocaleString('pl-PL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Termin wkrótce'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    
  },
  container: {
    flex: 1,
    
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  locationError: {
    color: Colors.accent,
    marginTop: 6,
    fontSize: 12,
  },
  filters: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
    zIndex: 40,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    gap: 8,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  mapWrapper: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  mapCallout: {
    position: 'absolute',
    alignItems: 'center',
  },
  mapCalloutButton: {
    backgroundColor: '#EAF1FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  mapCalloutTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  mapCalloutMeta: {
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  mapOverlayBottom: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'column',
    gap: 10,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  fallbackTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  overlayIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheet: {
    height: 240,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: Colors.surface,
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: {
    fontWeight: '700',
    color: Colors.textPrimary,
    fontSize: 16,
  },
  sheetMeta: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardsRow: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  card: {
    width: 240,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 14,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardCategory: {
    color: Colors.textSecondary,
    marginTop: 4,
    fontSize: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cardMetaText: {
    color: Colors.textSecondary,
    flex: 1,
  },
});

export default MapScreen;

