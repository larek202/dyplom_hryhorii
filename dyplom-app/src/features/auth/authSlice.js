import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const guestUser = {
  id: 'guest',
  name: 'Gość',
  role: 'user',
};

const initialState = {
  user: guestUser,
  status: 'guest', // 'guest' | 'loading' | 'authenticated'
  error: null,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.status = 'authenticated';
      state.error = null;
      // Сохраняем токен в AsyncStorage
      if (token) {
        AsyncStorage.setItem('authToken', token);
      }
    },
    logout(state) {
      state.user = guestUser;
      state.status = 'guest';
      state.error = null;
      state.token = null;
      // Удаляем токен из AsyncStorage
      AsyncStorage.removeItem('authToken');
    },
    setAuthError(state, action) {
      state.error = action.payload;
      state.status = 'guest';
    },
    setLoading(state, action) {
      state.status = action.payload ? 'loading' : 'guest';
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
    },
    promoteToOrganizer(state) {
      state.user = {
        ...state.user,
        role: 'organizer',
      };
      state.status = 'authenticated';
    },
  },
});

export const { 
  setCredentials, 
  logout, 
  setAuthError, 
  setLoading,
  updateUser,
  promoteToOrganizer 
} = authSlice.actions;
export default authSlice.reducer;




