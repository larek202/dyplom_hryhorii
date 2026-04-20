import { createApi } from '@reduxjs/toolkit/query/react';
import api from '../../services/api';

export const organizerApi = createApi({
  reducerPath: 'organizerApi',
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
  tagTypes: ['Organizer'],
  endpoints: (builder) => ({
    // Регистрация организатора
    registerOrganizer: builder.mutation({
      query: (organizationData) => ({
        url: '/organizer/register',
        method: 'POST',
        body: organizationData,
      }),
      invalidatesTags: ['Organizer'],
    }),
    
    // Получить профиль организатора
    getOrganizerProfile: builder.query({
      query: () => ({
        url: '/organizer/profile',
        method: 'GET',
      }),
      providesTags: ['Organizer'],
    }),
    // Обновить профиль организатора
    updateOrganizerProfile: builder.mutation({
      query: (organizationData) => ({
        url: '/organizer/profile',
        method: 'PUT',
        body: organizationData,
      }),
      invalidatesTags: ['Organizer'],
    }),
  }),
});

export const {
  useRegisterOrganizerMutation,
  useGetOrganizerProfileQuery,
  useUpdateOrganizerProfileMutation,
} = organizerApi;




