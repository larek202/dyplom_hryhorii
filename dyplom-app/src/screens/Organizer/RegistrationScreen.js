import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import TextInputField from '../../components/Forms/TextInputField';
import { Colors } from '../../styles/colors';
import * as ImagePicker from 'expo-image-picker';
import {
  useRegisterOrganizerMutation,
  useGetOrganizerProfileQuery,
  useUpdateOrganizerProfileMutation,
} from '../../features/organizer/api';
import { updateUser } from '../../features/auth';
import { uploadImages } from '../../utils/uploadImages';

const OrganizerRegistrationScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [registerOrganizer, { isLoading }] = useRegisterOrganizerMutation();
  const [updateOrganizer, { isLoading: isUpdating }] = useUpdateOrganizerProfileMutation();
  const [logoUploading, setLogoUploading] = useState(false);
  const { data: organizerProfileData } = useGetOrganizerProfileQuery(undefined, {
    skip: !user,
  });
  const organizerProfile =
    organizerProfileData?.organization || organizerProfileData?.organizer || organizerProfileData?.profile;
  const isEditing =
    route?.params?.mode === 'edit' || user?.role === 'organizer' || Boolean(organizerProfile);
  const [isPrefilled, setIsPrefilled] = useState(false);

  const resolvedAddress = useMemo(() => {
    if (!organizerProfile?.address) return '';
    if (typeof organizerProfile.address === 'string') return organizerProfile.address;
    const { street, city: addressCity, zipCode, country } = organizerProfile.address || {};
    return [street, addressCity, zipCode, country].filter(Boolean).join(', ');
  }, [organizerProfile]);

  useEffect(() => {
    if (!organizerProfile || isPrefilled) return;
    setName(organizerProfile.name || '');
    setDescription(organizerProfile.description || '');
    setContactEmail(organizerProfile.contactEmail || '');
    setContactPhone(organizerProfile.contactPhone || '');
    setWebsite(organizerProfile.website || '');
    setCity(organizerProfile.city || organizerProfile.address?.city || '');
    setAddress(resolvedAddress || '');
    setLogoUrl(organizerProfile.logoUrl || '');
    setFacebook(organizerProfile.facebook || '');
    setInstagram(organizerProfile.instagram || '');
    setIsPrefilled(true);
  }, [organizerProfile, isPrefilled, resolvedAddress]);

  const handlePickLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii, aby dodać logo');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      setLogoUploading(true);
      const uploaded = await uploadImages([result.assets[0].uri]);
      const uploadedUrl = uploaded?.[0];
      if (uploadedUrl) {
        setLogoUrl(uploadedUrl);
      }
    } catch (e) {
      Alert.alert('Błąd', e?.message || 'Nie udało się dodać logo');
    } finally {
      setLogoUploading(false);
    }
  }, []);

  const handleSubmit = async () => {
    // Walidacja
    if (!name.trim()) {
      Alert.alert('Błąd', 'Wpisz nazwę organizacji');
      return;
    }

    try {
      const trimmedLogo = logoUrl.trim();
      const payload = {
        name: name.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        logoUrl: isEditing ? trimmedLogo : trimmedLogo || undefined,
        facebook: facebook.trim() || undefined,
        instagram: instagram.trim() || undefined,
      };

      if (isEditing) {
        await updateOrganizer(payload).unwrap();
      } else {
        await registerOrganizer(payload).unwrap();
      }

      if (!isEditing) {
        // Aktualizujemy rolę użytkownika w Redux
        dispatch(updateUser({
          role: 'organizer',
        }));
      }

      Alert.alert(
        'Sukces',
        isEditing
          ? 'Dane organizatora zostały zaktualizowane!'
          : 'Rejestracja organizatora zakończona powodzeniem!',
        [
          {
            text: 'OK',
            onPress: () => navigation.popToTop(),
          },
        ]
      );
    } catch (error) {
      console.error('Organizer registration error:', error);
      const errorMessage = error.data?.error || error.message || 'Błąd podczas rejestracji organizatora';
      Alert.alert('Błąd', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={false}
          removeClippedSubviews={false}
        >
          <View key="scroll-content-wrapper">
            <Text style={styles.title}>
              {isEditing ? 'Edytuj dane organizatora' : 'Zostań organizatorem'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing
                ? 'Zaktualizuj dane organizacji.'
                : 'Wprowadź podstawowe dane organizacji i zacznij udostępniać swoje wydarzenia.'}
            </Text>

            <View style={styles.form}>
              <TextInputField
                key="name"
                label="Nazwa organizacji *"
                placeholder="np. Klub Wspinaczy"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInputField
                key="description"
                label="Opis"
                placeholder="Krótki opis twojej działalności"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
              <TextInputField
                key="contactEmail"
                label="E-mail kontaktowy"
                placeholder="kontakt@example.com"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInputField
                key="contactPhone"
                label="Telefon kontaktowy"
                placeholder="+48 123 456 789"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
              <TextInputField
                key="website"
                label="Strona internetowa"
                placeholder="https://example.com"
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
              />
            <View style={styles.logoBlock}>
              <Text style={styles.logoLabel}>Logo organizacji</Text>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>Brak logo</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.logoButton, logoUploading && styles.buttonDisabled]}
                onPress={handlePickLogo}
                disabled={logoUploading}
              >
                {logoUploading ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={styles.logoButtonText}>
                    {logoUrl ? 'Zmień logo' : 'Dodaj logo'}
                  </Text>
                )}
              </TouchableOpacity>
              {logoUrl ? (
                <TouchableOpacity
                  style={styles.logoRemoveButton}
                  onPress={() =>
                    Alert.alert('Usuń logo', 'Czy na pewno chcesz usunąć logo?', [
                      { text: 'Anuluj', style: 'cancel' },
                      { text: 'Usuń', style: 'destructive', onPress: () => setLogoUrl('') },
                    ])
                  }
                >
                  <Text style={styles.logoRemoveText}>Usuń logo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInputField
              key="city"
              label="Miasto"
              placeholder="np. Warszawa"
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
            <TextInputField
              key="address"
              label="Adres"
              placeholder="ul. Przykładowa 10"
              value={address}
              onChangeText={setAddress}
            />
            <TextInputField
              key="facebook"
              label="Facebook"
              placeholder="https://facebook.com/nazwa"
              value={facebook}
              onChangeText={setFacebook}
              keyboardType="url"
              autoCapitalize="none"
            />
            <TextInputField
              key="instagram"
              label="Instagram"
              placeholder="https://instagram.com/nazwa"
              value={instagram}
              onChangeText={setInstagram}
              keyboardType="url"
              autoCapitalize="none"
            />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (isLoading || isUpdating) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading || isUpdating}
            >
              {isLoading || isUpdating ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.submitText}>
                  {isEditing ? 'Zapisz zmiany' : 'Wyślij zgłoszenie'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  logoBlock: {
    marginBottom: 16,
  },
  logoLabel: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  logoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'flex-start',
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'flex-start',
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoPlaceholderText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  logoButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  logoButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  logoRemoveButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  logoRemoveText: {
    color: Colors.accent,
    fontWeight: '700',
  },
});

export default OrganizerRegistrationScreen;