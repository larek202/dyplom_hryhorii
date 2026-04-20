import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Colors } from '../../styles/colors';
import TextInputField from '../../components/Forms/TextInputField';
import { useUpdateProfileMutation } from '../../features/auth';
import { setCredentials } from '../../features/auth/authSlice';
import * as ImagePicker from 'expo-image-picker';
import { uploadImages } from '../../utils/uploadImages';

const ProfileSettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  useEffect(() => {
    setFirstName(user.firstName || user.name?.split(' ')[0] || '');
    setLastName(user.lastName || user.name?.split(' ').slice(1).join(' ') || '');
    setEmail(user.email || '');
    setAvatar(user.avatar || '');
  }, [user]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii, aby ustawić zdjęcie profilowe');
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

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Imię i nazwisko są wymagane');
      return;
    }
    if (!email.trim()) {
      alert('E-mail jest wymagany');
      return;
    }
    try {
      let avatarUrl = avatar;
      if (avatar && !/^https?:\/\//i.test(avatar)) {
        const uploaded = await uploadImages([avatar]);
        avatarUrl = uploaded?.[0] || '';
      }

      const resp = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName} ${lastName}`.trim(),
        email: email.trim().toLowerCase(),
        avatar: avatarUrl,
      }).unwrap();

      // обновляем store, сохраняя текущий токен
      if (resp?.user) {
        dispatch(setCredentials({ user: resp.user, token }));
      }
      alert('Zapisano zmiany');
      navigation.goBack();
    } catch (e) {
      const msg = e?.data?.error || e?.message || 'Nie udało się zapisać zmian';
      alert(msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Ustawienia profilu</Text>
        <TextInputField label="Imię" value={firstName} onChangeText={setFirstName} />
        <TextInputField label="Nazwisko" value={lastName} onChangeText={setLastName} />
        <TextInputField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TouchableOpacity style={styles.avatarRow} onPress={pickAvatar} activeOpacity={0.8}>
          <Text style={styles.avatarLabel}>Zdjęcie profilowe</Text>
          <Text style={styles.avatarAction}>{avatar ? 'Zmień' : 'Dodaj'}</Text>
        </TouchableOpacity>
        {avatar ? (
          <View style={styles.avatarPreviewWrapper}>
            <Text style={styles.previewLabel}>Podgląd</Text>
            <View style={styles.avatarPreview}>
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveText}>{isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ChangePassword')}
          disabled={isLoading}
        >
          <Text style={styles.secondaryText}>Zmień hasło</Text>
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
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  avatarRow: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  avatarAction: {
    color: Colors.primary,
    fontWeight: '600',
  },
  avatarPreviewWrapper: {
    marginTop: 12,
    marginBottom: 4,
  },
  previewLabel: {
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileSettingsScreen;

