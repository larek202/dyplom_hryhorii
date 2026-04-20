import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import TextInputField from '../../components/Forms/TextInputField';
import { Colors } from '../../styles/colors';
import { useDispatch } from 'react-redux';
import { useRegisterMutation } from '../../features/auth';
import { setCredentials } from '../../features/auth';
import { favoritesApi } from '../../features/favorites/api';
import { bookingsApi } from '../../features/bookings/api';
import * as ImagePicker from 'expo-image-picker';
import { uploadImages } from '../../utils/uploadImages';

const RegisterScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const dispatch = useDispatch();
  const [register, { isLoading }] = useRegisterMutation();

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii, aby dodać zdjęcie profilowe');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    // Walidacja
    if (!firstName.trim()) {
      Alert.alert('Błąd', 'Wpisz imię');
      return;
    }

    if (!lastName.trim()) {
      Alert.alert('Błąd', 'Wpisz nazwisko');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Błąd', 'Wpisz e-mail');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Błąd', 'Wpisz poprawny e-mail');
      return;
    }

    if (!password) {
      Alert.alert('Błąd', 'Wpisz hasło');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Błąd', 'Hasła się nie zgadzają');
      return;
    }

    try {
      let avatarUrl = avatar;
      if (avatar && !/^https?:\/\//i.test(avatar)) {
        const uploaded = await uploadImages([avatar]);
        avatarUrl = uploaded?.[0] || '';
      }

      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName} ${lastName}`.trim(),
        email: email.trim().toLowerCase(),
        password,
        avatar: avatarUrl,
      }).unwrap();

      // Сохраняем данные пользователя и токен
      dispatch(setCredentials({
        user: result.user,
        token: result.token,
      }));

      const userId = result.user.id || result.user._id;
      // Синхронизируем избранное/резервации с backend (ключ по userId)
      dispatch(
        favoritesApi.endpoints.getFavorites.initiate(
          { userId },
          { forceRefetch: true }
        )
      );
      dispatch(
        bookingsApi.endpoints.getBookings.initiate(
          { userId },
          { forceRefetch: true }
        )
      );

      Alert.alert('Sukces', 'Rejestracja zakończona powodzeniem!');
    } catch (error) {
      console.error('Registration error:', error);
      
      // Bardziej szczegółowa obsługa błędów
      let errorMessage = 'Błąd podczas rejestracji';
      
      if (error.data?.error) {
        errorMessage = error.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 'CUSTOM_ERROR') {
        errorMessage = 'Brak połączenia z serwerem. Sprawdź, czy backend działa i adres URL jest poprawny.';
      } else if (!error.response) {
        errorMessage = 'Nie udało się połączyć z serwerem. Upewnij się, że:\n1. Backend jest uruchomiony (npm run dev w folderze backend)\n2. Adres IP jest poprawny w src/services/api.js';
      }
      
      Alert.alert('Błąd rejestracji', errorMessage);
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
          nestedScrollEnabled={false}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        >
          <View key="scroll-content-wrapper">
            <View style={styles.header}>
              <Text style={styles.title}>Rejestracja</Text>
              <Text style={styles.subtitle}>
                Utwórz konto, aby korzystać z aplikacji
              </Text>
            </View>

            <View style={styles.form}>
          <TextInputField
            key="firstName"
            label="Imię"
            placeholder="Twoje imię"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <TextInputField
            key="lastName"
            label="Nazwisko"
            placeholder="Twoje nazwisko"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
          <TextInputField
            key="email"
            label="E‑mail"
            placeholder="twoj@email.pl"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInputField
            key="password"
          label="Hasło"
          placeholder="Minimum 6 znaków"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInputField
            key="confirmPassword"
          label="Potwierdź hasło"
          placeholder="Powtórz hasło"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
      <TouchableOpacity style={styles.avatarButton} onPress={pickAvatar} activeOpacity={0.8}>
        <Text style={styles.avatarText}>{avatar ? 'Zmień zdjęcie profilowe' : 'Dodaj zdjęcie profilowe'}</Text>
      </TouchableOpacity>
      {avatar ? (
        <View style={styles.avatarPreview}>
          <Text style={styles.previewLabel}>Podgląd</Text>
          <View style={styles.avatarCircle}>
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          </View>
        </View>
      ) : null}
            </View>

            <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Zarejestruj się</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>
                Masz już konto? Zaloguj się
              </Text>
            </TouchableOpacity>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  avatarButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  avatarPreview: {
    marginTop: 10,
    alignItems: 'center',
  },
  previewLabel: {
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});

export default RegisterScreen;

