import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import TextInputField from '../../components/Forms/TextInputField';
import DateTimePickerField from '../../components/Forms/DateTimePickerField';
import ImagePickerField from '../../components/Forms/ImagePickerField';
import GooglePlacesAutocomplete from '../../components/Forms/GooglePlacesAutocomplete';
import CategorySelect from '../../components/Forms/CategorySelect';
import { Colors } from '../../styles/colors';
import { useCreateEventMutation, useUpdateEventMutation } from '../../features/events/api';
import { uploadImages } from '../../utils/uploadImages';
import CATEGORIES from '../../constants/categories';

const CreateEventScreen = ({ navigation }) => {
  const user = useSelector((state) => state.auth.user);
  const route = useRoute();
  const editingEvent = route.params?.event;
  const editingEventId = editingEvent?._id || editingEvent?.id;
  const [initialLoad, setInitialLoad] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [date, setDate] = useState(null);
  const [images, setImages] = useState([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [customCategory, setCustomCategory] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [createEvent, { isLoading }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();

  useEffect(() => {
    if (editingEvent && !initialLoad) {
      setTitle(editingEvent.title || '');
      const categoriesFromEvent = editingEvent.categories?.length
        ? editingEvent.categories
        : editingEvent.category
        ? [editingEvent.category]
        : [];
      const matched = categoriesFromEvent.filter((cat) => CATEGORIES.includes(cat) && cat !== 'Inne');
      const custom = categoriesFromEvent.find((cat) => cat && !CATEGORIES.includes(cat));
      setSelectedCategories(matched);
      setCustomCategory(custom || '');
      if (custom) {
        setSelectedCategories((prev) => (prev.includes('Inne') ? prev : [...prev, 'Inne']));
      }
      setCity(editingEvent.city || '');
      setAddress(editingEvent.location?.address || '');
      setPostalCode(editingEvent.location?.postalCode || '');
      setDescription(editingEvent.description || '');
      setPrice(editingEvent.price ? String(editingEvent.price) : '');
      setMaxParticipants(editingEvent.maxParticipants ? String(editingEvent.maxParticipants) : '');
      setDate(editingEvent.date ? new Date(editingEvent.date) : null);
      setImages(editingEvent.images || []);
      setCoverImageIndex(
        editingEvent.coverImageIndex != null && Number.isFinite(Number(editingEvent.coverImageIndex))
          ? Math.max(0, Math.floor(Number(editingEvent.coverImageIndex)))
          : 0,
      );
      if (editingEvent.location) {
        setLocationData({
          location: {
            lat: editingEvent.location.latitude,
            lng: editingEvent.location.longitude,
          },
          address: editingEvent.location.address,
          postalCode: editingEvent.location.postalCode,
        });
      }
      setInitialLoad(true);
    }
  }, [editingEvent, initialLoad]);

  useEffect(() => {
    if (!images.length) {
      setCoverImageIndex(0);
      return;
    }
    setCoverImageIndex((i) => Math.min(Math.max(0, i), images.length - 1));
  }, [images.length]);

  // Sprawdzenie, czy użytkownik jest organizatorem
  if (user.role !== 'organizer') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Tylko organizatorzy mogą tworzyć wydarzenia
        </Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    // Walidacja
    if (!title.trim()) {
      Alert.alert('Błąd', 'Wpisz nazwę wydarzenia');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Błąd', 'Wybierz miasto z listy');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Błąd', 'Wybierz adres z listy');
      return;
    }

    if (!postalCode.trim()) {
      Alert.alert('Błąd', 'Kod pocztowy jest wymagany');
      return;
    }

    try {
      // Najpierw wysyłamy zdjęcia na serwer (S3)
      let imageUrls = [];
      if (images.length > 0) {
        setUploadingImages(true);
        try {
          imageUrls = await uploadImages(images);
          console.log('Uploaded images URLs:', imageUrls);
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          Alert.alert('Błąd', 'Nie udało się przesłać zdjęć. Spróbuj ponownie.');
          setUploadingImages(false);
          return;
        } finally {
          setUploadingImages(false);
        }
      }

      // Tworzymy wydarzenie z URL-ami zdjęć z S3
      const explicitCategories = selectedCategories.filter((cat) => cat && cat !== 'Inne');
      const trimmedCustom = customCategory.trim();
      const finalCategories = [...new Set([
        ...explicitCategories,
        ...(trimmedCustom ? [trimmedCustom] : []),
      ])];
      const finalCategory = finalCategories[0] || undefined;
      const eventData = {
        title: title.trim(),
        city: city.trim(),
        description: description.trim() || undefined,
        category: finalCategory,
        categories: finalCategories.length > 0 ? finalCategories : undefined,
        price: price ? parseFloat(price) : 0,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
        date: date ? date.toISOString() : undefined,
        ...(imageUrls.length > 0
          ? {
              images: imageUrls,
              coverImageIndex: Math.min(
                Math.max(0, coverImageIndex),
                imageUrls.length - 1,
              ),
            }
          : {}),
        location: locationData
          ? {
              address: address.trim(),
              postalCode: postalCode.trim(),
              latitude: locationData.location?.lat,
              longitude: locationData.location?.lng,
            }
          : {
              address: address.trim(),
              postalCode: postalCode.trim(),
            },
      };

      if (editingEventId) {
        await updateEvent({ id: editingEventId, ...eventData }).unwrap();
        Alert.alert('Sukces', 'Wydarzenie zostało zaktualizowane!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        await createEvent(eventData).unwrap();
        Alert.alert('Sukces', 'Wydarzenie zostało utworzone!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Create event error:', error);
      const errorMessage = error.data?.error || error.message || 'Błąd podczas tworzenia wydarzenia';
      Alert.alert('Błąd', errorMessage);
    }
  };

  return (
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
          <Text style={styles.title}>{editingEventId ? 'Edytuj wydarzenie' : 'Utwórz wydarzenie'}</Text>
          <Text style={styles.subtitle}>
            {editingEventId
              ? 'Zaktualizuj dane wydarzenia'
              : 'Wypełnij formularz, aby utworzyć nowe wydarzenie'}
          </Text>

          <View style={styles.form}>
          <TextInputField
            key="title"
            label="Nazwa wydarzenia *"
            value={title}
            onChangeText={setTitle}
            placeholder="np. Trening biegowy"
            autoCapitalize="words"
          />
          <CategorySelect
            label="Kategoria"
            value={selectedCategories}
            onSelect={(value) => {
              setSelectedCategories(value);
              if (!value.includes('Inne')) {
                setCustomCategory('');
              }
            }}
            placeholder="Wybierz kategorię"
            categories={CATEGORIES}
          />
          {selectedCategories.includes('Inne') && (
            <TextInputField
              key="customCategory"
              label="Własna kategoria"
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder="Wpisz własną kategorię"
            />
          )}
          <View style={styles.autocompleteWrapperTop}>
            <GooglePlacesAutocomplete
              key="city"
              label="Miasto *"
              value={city}
              onChange={setCity}
              placeholder="Wybierz miasto z listy"
              type="cities"
              required
              onPlaceSelect={(place) => {
                // Устанавливаем только название города
                setCity(place.city || place.description);
              }}
            />
          </View>
          <View style={styles.autocompleteWrapperBottom}>
            <GooglePlacesAutocomplete
              key="address"
              label="Adres ulicy *"
              value={address}
              onChange={setAddress}
              placeholder="Wybierz adres ulicy z listy"
              type="address"
              required
              disableValidation={true}
              onPlaceSelect={(place) => {
                // Ustawiamy адрес без miasta i kraju (ulica + numer)
                const rawAddress = place.address || place.description || '';
                if (rawAddress) {
                  const firstPart = rawAddress.split(',')[0].trim();
                  setAddress(firstPart);
                } else if (place.street) {
                  setAddress(place.street);
                } else {
                  setAddress('');
                }
                // Сохраняем почтовый код
                if (place.postalCode) {
                  setPostalCode(place.postalCode);
                }
                setLocationData(place);
              }}
            />
          </View>
          <TextInputField
            key="postalCode"
            label="Kod pocztowy *"
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="np. 00-000"
            keyboardType="number-pad"
            editable={false}
          />
          <TextInputField
            key="description"
            label="Opis"
            value={description}
            onChangeText={setDescription}
            placeholder="Dodaj szczegółowy opis wydarzenia"
            multiline
            numberOfLines={4}
          />
          <TextInputField
            key="price"
            label="Cena (PLN)"
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          <TextInputField
            key="maxParticipants"
            label="Maksymalna liczba uczestników"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="20"
            keyboardType="number-pad"
          />
          <DateTimePickerField
            key="date"
            label="Data i czas *"
            value={date}
            onChange={setDate}
            mode="datetime"
            placeholder="Wybierz datę i czas wydarzenia"
            minimumDate={new Date()}
          />
          <ImagePickerField
            key="images"
            label="Zdjęcia (opcjonalnie)"
            images={images}
            onChange={setImages}
            maxImages={5}
            coverIndex={coverImageIndex}
            onCoverIndexChange={setCoverImageIndex}
          />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (isLoading || uploadingImages || isUpdating) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || uploadingImages || isUpdating}
          >
            {(isLoading || uploadingImages || isUpdating) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.surface} />
                <Text style={styles.loadingText}>
                  {uploadingImages
                    ? 'Przesyłanie zdjęć...'
                    : editingEventId
                      ? 'Aktualizowanie wydarzenia...'
                      : 'Tworzenie wydarzenia...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitText}>
                {editingEventId ? 'Zaktualizuj wydarzenie' : 'Zapisz wydarzenie'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 16,
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
  autocompleteWrapperTop: {
    zIndex: 50,
    elevation: 50,
  },
  autocompleteWrapperBottom: {
    zIndex: 40,
    elevation: 40,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
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
  errorText: {
    color: Colors.accent,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.surface,
    marginLeft: 12,
    fontSize: 16,
  },
});

export default CreateEventScreen;

