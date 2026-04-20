import { createApi } from '@reduxjs/toolkit/query/react';
import api from '../../services/api';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: async ({ url, method = 'GET', body }) => {
    try {
      const response = await api({
        url,
        method,
        data: body,
      });
      return { data: response.data };
    } catch (error) {
      return {
        error: {
          status: error.response?.status || 'CUSTOM_ERROR',
          data: error.response?.data || error.message,
        },
      };
    }
  },
  endpoints: (builder) => ({
    // Регистрация
    register: builder.mutation({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
    
    // Вход
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    
    // Aktualizacja profilu
    updateProfile: builder.mutation({
      query: (payload) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: payload,
      }),
    }),

    // Zmiana hasła
    changePassword: builder.mutation({
      query: (payload) => ({
        url: '/auth/password',
        method: 'PUT',
        body: payload,
      }),
    }),
    updateNotifications: builder.mutation({
      query: (payload) => ({
        url: '/auth/notifications',
        method: 'PUT',
        body: payload,
      }),
    }),

    // Получить текущего пользователя
    getMe: builder.query({
      query: () => ({
        url: '/auth/me',
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetMeQuery,
  useUpdateNotificationsMutation,
} = authApi;




