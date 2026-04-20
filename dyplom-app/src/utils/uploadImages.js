import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL вашего backend API (должен совпадать с api.js)
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.110:3000/api'  // ЗАМЕНИТЕ на IP вашего компьютера!
  : 'https://your-api.com/api';   // Для продакшена

/**
 * Загружает изображения на сервер
 * @param {string[]} imageUris - Массив локальных URI изображений
 * @returns {Promise<string[]>} Массив URL загруженных изображений из S3
 */
export const uploadImages = async (imageUris) => {
  if (!imageUris || imageUris.length === 0) {
    return [];
  }

  try {
    const token = await AsyncStorage.getItem('authToken');
    const remoteImages = imageUris.filter((uri) => /^https?:\/\//i.test(uri));
    const localImages = imageUris.filter((uri) => !/^https?:\/\//i.test(uri));

    if (localImages.length === 0) {
      return remoteImages;
    }

    const formData = new FormData();
    localImages.forEach((uri, index) => {
      const uriParts = uri.split('.');
      const extension = uriParts.length > 1
        ? uriParts[uriParts.length - 1].split('?')[0].toLowerCase()
        : 'jpg';

      const mimeType = extension === 'png' ? 'image/png' :
        extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
          extension === 'gif' ? 'image/gif' :
            extension === 'webp' ? 'image/webp' : 'image/jpeg';

      const filename = `image_${Date.now()}_${index}.${extension}`;
      const fileUri = Platform.OS === 'ios' && uri.startsWith('file://')
        ? uri.replace('file://', '')
        : uri;

      formData.append('images', {
        uri: fileUri,
        type: mimeType,
        name: filename,
      });
    });

    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.images) {
      return [...remoteImages, ...data.images];
    }

      throw new Error(data.error || 'Nie udało się przesłać zdjęć');
  } catch (error) {
    console.error('Error uploading images:', error);
    throw new Error(
      error.message || 
      'Błąd podczas przesyłania zdjęć'
    );
  }
};




