import { createApi } from '@reduxjs/toolkit/query/react';
import api from '../../services/api';

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: async ({ url, method = 'GET', body, params }) => {
    try {
      const response = await api({
        url,
        method,
        data: body,
        params,
      });
      // Backend возвращает данные в response.data
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
  tagTypes: ['Event'],
  endpoints: (builder) => ({
    // Получить все события
    listEvents: builder.query({
      query: (params = {}) => ({
        url: '/events',
        params, // { city, search, organizerId, page, limit }
      }),
      providesTags: ['Event'],
      /** Szybsze ponowne wejście na Mapę / Start z cache po przełączeniu zakładek. */
      keepUnusedDataFor: 300,
      // Преобразуем ответ: backend возвращает { events, pagination }
      transformResponse: (response) => {
        // Если ответ уже массив (старый формат), возвращаем как есть
        if (Array.isArray(response)) {
          return response;
        }
        // Если новый формат с pagination, возвращаем массив events
        return response.events || response;
      },
    }),
    
    // Получить одно событие по ID
    getEvent: builder.query({
      query: (id) => ({
        url: `/events/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Event', id }],
    }),
    
    // Создать новое событие
    createEvent: builder.mutation({
      query: (event) => ({
        url: '/events',
        method: 'POST',
        body: event,
      }),
      invalidatesTags: ['Event'],
    }),
    
    // Обновить событие
    updateEvent: builder.mutation({
      query: ({ id, ...event }) => ({
        url: `/events/${id}`,
        method: 'PUT',
        body: event,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }],
    }),
    
    // Удалить событие
    deleteEvent: builder.mutation({
      query: (id) => ({
        url: `/events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Event', id }],
    }),
  }),
});

export const {
  useListEventsQuery,
  useGetEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} = eventsApi;




