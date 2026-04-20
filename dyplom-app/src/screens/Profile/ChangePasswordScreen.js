import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Colors } from '../../styles/colors';
import TextInputField from '../../components/Forms/TextInputField';
import { useChangePasswordMutation } from '../../features/auth';

const ChangePasswordScreen = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleSave = async () => {
    if (!password || !confirm) {
      Alert.alert('Błąd', 'Wpisz nowe hasło w obu polach');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Błąd', 'Hasła się nie zgadzają');
      return;
    }
    try {
      await changePassword({ newPassword: password }).unwrap();
      Alert.alert('Sukces', 'Hasło zostało zmienione', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg = e?.data?.error || e?.message || 'Nie udało się zmienić hasła';
      Alert.alert('Błąd', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Zmień hasło</Text>
        <TextInputField
          label="Nowe hasło"
          placeholder="Minimum 6 znaków"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInputField
          label="Powtórz hasło"
          placeholder="Powtórz nowe hasło"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveText}>{isLoading ? 'Zapisywanie...' : 'Zapisz'}</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    color: Colors.textPrimary,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: Colors.surface,
    fontWeight: '700',
  },
});

export default ChangePasswordScreen;





