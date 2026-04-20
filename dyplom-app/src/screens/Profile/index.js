import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Platform,
  StatusBar,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { Colors } from '../../styles/colors';
import {
  logout,
  useUpdateProfileMutation,
  setCredentials,
  updateUser,
  useUpdateNotificationsMutation,
} from '../../features/auth';
import * as ImagePicker from 'expo-image-picker';
import { uploadImages } from '../../utils/uploadImages';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const bookingsCount = useSelector((state) => state.bookings.list.length);
  const favoritesCount = useSelector((state) => state.favorites.ids.length);
  const token = useSelector((state) => state.auth.token);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [updateProfile, { isLoading: isUpdatingAvatar }] = useUpdateProfileMutation();
  const [updateNotifications] = useUpdateNotificationsMutation();
  
  // Imię i nazwisko wyświetlamy oddzielnie; fallback na name, a potem na "Użytkownik"
  const computedFirstName = user.firstName || (user.name ? user.name.split(' ')[0] : '');
  const computedLastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
  const userEmail = user.email || '';

  const [refreshing, setRefreshing] = useState(false);
  React.useEffect(() => {
    setPushEnabled(user?.pushEnabled !== false);
  }, [user?.pushEnabled]);
  React.useEffect(() => {
    setEmailEnabled(user?.emailEnabled !== false);
  }, [user?.emailEnabled]);
  const onRefresh = useCallback(async () => {
    // Если нет реального запроса — просто быстрый спиннер
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const handleChangePhoto = async () => {
    if (!userEmail) {
      Alert.alert('Błąd', 'Brak adresu e-mail w profilu. Uzupełnij go przed zmianą zdjęcia.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii, aby zmienić zdjęcie profilowe');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      try {
        const uploaded = await uploadImages([result.assets[0].uri]);
        const avatarUrl = uploaded?.[0];
        if (avatarUrl) {
          const fullName = user.name || `${computedFirstName} ${computedLastName}`.trim();
          const resp = await updateProfile({
            avatar: avatarUrl,
            email: userEmail,
            firstName: computedFirstName,
            lastName: computedLastName,
            name: fullName,
          }).unwrap();
          if (resp?.user) {
            dispatch(setCredentials({ user: resp.user, token }));
          }
        }
      } catch (e) {
        Alert.alert('Błąd', e?.message || 'Nie udało się zmienić zdjęcia');
      }
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Twój profil</Text>
        <View style={styles.photoSection}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {(computedFirstName || 'U')[0]}
                {(computedLastName || 'P')[0] || ''}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.changePhoto} onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Zmień zdjęcie</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Imię</Text>
          <Text style={styles.value}>{computedFirstName || 'Użytkownik'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nazwisko</Text>
          <Text style={styles.value}>{computedLastName || ' '}</Text>
        </View>
        {userEmail ? (
          <View style={styles.infoRow}>
            <Text style={styles.label}>E-mail</Text>
            <Text style={styles.value}>{userEmail}</Text>
          </View>
        ) : null}
        {user.role === 'organizer' ? (
          <View style={styles.card}>
            <View style={styles.roleRow}>
              <Text style={styles.roleInline}>
                Rola:{' '}
                <Text
                  style={styles.roleValue}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Organizator 💼
                </Text>
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate('BookingTab')}
            activeOpacity={0.8}
          >
            <Text style={styles.statLabel}>Rezerwacje</Text>
            <Text style={styles.statValue}>{bookingsCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stat, styles.statLast]}
            onPress={() => navigation.navigate('Favorites')}
            activeOpacity={0.8}
          >
            <Text style={styles.statLabel}>Ulubione</Text>
            <Text style={styles.statValue}>{favoritesCount}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Powiadomienia</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Push</Text>
            <Switch
              value={pushEnabled}
              onValueChange={async (value) => {
                setPushEnabled(value);
                try {
                  const resp = await updateNotifications({ pushEnabled: value }).unwrap();
                  if (resp?.user) {
                    dispatch(updateUser(resp.user));
                  }
                  const storageKey = `push_enabled_${user?._id || user?.id || 'guest'}`;
                  await AsyncStorage.setItem(storageKey, value ? '1' : '0');
                } catch (e) {
                  setPushEnabled((prev) => !prev);
                  Alert.alert('Błąd', e?.message || 'Nie udało się zapisać ustawień.');
                }
              }}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>E-mail</Text>
            <Switch
              value={emailEnabled}
              onValueChange={async (value) => {
                setEmailEnabled(value);
                try {
                  const resp = await updateNotifications({ emailEnabled: value }).unwrap();
                  if (resp?.user) {
                    dispatch(updateUser(resp.user));
                  }
                } catch (e) {
                  setEmailEnabled((prev) => !prev);
                  Alert.alert('Błąd', e?.message || 'Nie udało się zapisać ustawień.');
                }
              }}
            />
          </View>
        </View>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ProfileSettings')}
        >
          <Text style={styles.secondaryButtonText}>Edytuj dane</Text>
        </TouchableOpacity>
        {!user.role || user.role !== 'organizer' ? (
          <TouchableOpacity
            style={styles.organizerButton}
            onPress={() => navigation.navigate('BecomeOrganizer')}
          >
            <Text style={styles.organizerButtonText}>Zostań organizatorem</Text>
          </TouchableOpacity>
        ) : null}
        {user.role === 'organizer' ? (
          <TouchableOpacity
            style={styles.organizerButton}
            onPress={() => navigation.navigate('OrganizerPanel')}
          >
            <Text style={styles.organizerButtonText}>Panel organizatora</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.logoutButton} onPress={() => dispatch(logout())}>
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>
        <View style={{ height: 16 }} />
      </ScrollView>
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
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleInline: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  roleValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginRight: 12,
  },
  statLast: {
    marginRight: 0,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  changePhoto: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  changePhotoText: {
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    color: Colors.textSecondary,
  },
  secondaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  secondaryButtonText: {
    color: Colors.surface,
    fontWeight: '700',
  },
  organizerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  organizerButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f15c5c',
    marginBottom: 40,
  },
  logoutText: {
    color: Colors.surface,
    fontWeight: '700',
  },
});

export default ProfileScreen;