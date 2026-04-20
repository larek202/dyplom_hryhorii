import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';







const API_BASE_URL = __DEV__ 
  ? 'http://10.195.29.204:3000/api'  //dev
  : 'http://10.195.29.204:3000/api'; //prod

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});


api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
     
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      
     
      if (__DEV__) {
        console.log('🌐 API Request:', config.method?.toUpperCase(), config.url);
        if (config.data instanceof FormData) {
          console.log('📤 Data: FormData (multipart/form-data)');
        } else {
          console.log('📤 Data:', config.data);
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('✅ API Response:', response.status, response.config.url);
      console.log('📥 Data:', response.data);
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      console.error('❌ API Error:', error.config?.url);
      console.error('Status:', error.response?.status);
      console.error('Error Data:', error.response?.data);
      console.error('Error Message:', error.message);
      if (!error.response) {
        console.error('⚠️ Błąd sieci – sprawdź, czy backend działa i adres IP jest poprawny!');
      }
    }
    
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('authToken');
      } catch (e) {
        console.error('Error removing auth token:', e);
      }
    }
    
    const errorMessage = error.response?.data?.error || error.message || 'Wystąpił błąd';
    return Promise.reject({
      ...error,
      message: errorMessage,
    });
  }
);

export default api;




