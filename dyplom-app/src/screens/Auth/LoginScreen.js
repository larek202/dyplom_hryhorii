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
} from 'react-native';
import TextInputField from '../../components/Forms/TextInputField';
import { Colors } from '../../styles/colors';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../../features/auth';
import { setCredentials } from '../../features/auth';
import { favoritesApi } from '../../features/favorites/api';
import { bookingsApi } from '../../features/bookings/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async () => {
    // Walidacja
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

    try {
      const result = await login({
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();

      // Zachowujemy dane użytkownika i token
      dispatch(setCredentials({
        user: result.user,
        token: result.token,
      }));

      const userId = result.user.id || result.user._id;
      // Pobieramy ulubione/rezerwacje z backendu z kluczem userId
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

      // Po udanym logowaniu nawigacja przejmie AppNavigator
    } catch (error) {
      const errorMessage = error.data?.error || error.message || 'Błąd logowania';
      Alert.alert('Błąd', errorMessage);
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoLetter}>M</Text>
        </View>
        <Text style={styles.logoText}>MoveMint</Text>
      </View>
      <Text style={styles.tagline}>
        Platforma do wyszukiwania i rezerwacji sportowych aktywności w Twojej okolicy.
      </Text>
      <View style={styles.form}>
        <TextInputField
          label="E‑mail"
          placeholder="twoj@email.pl"
          value={email}
          onChangeText={setEmail}
        />
        <TextInputField
          label="Hasło"
          placeholder="••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Zaloguj się</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Zarejestruj się</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  logoLetter: {
    color: Colors.surface,
    fontSize: 32,
    fontWeight: '700',
  },
  logoText: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  tagline: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 48,
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
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default LoginScreen;

