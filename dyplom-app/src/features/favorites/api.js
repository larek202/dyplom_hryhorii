import { createApi } from '@reduxjs/toolkit/query/react';
import api from '../../services/api';
import { setFavorites } from './favoritesSlice';

export const favoritesApi = createApi({
  reducerPath: 'favoritesApi',
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
  tagTypes: ['Favorites', 'FavoritesCounts'],
  endpoints: (builder) => ({
    getFavorites: builder.query({
      // keyujemy zapytanie po userId
      query: ({ userId } = {}) => ({ url: '/likes', method: 'GET', params: { userId } }),
      providesTags: ['Favorites'],
      transformResponse: (response) => response,
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const ids = Array.isArray(data?.ids)
            ? data.ids
            : Array.isArray(data?.likes)
              ? data.likes.map((l) => l.eventId || l)
              : [];
          dispatch(setFavorites(ids));
        } catch (e) {
          // ignore
        }
      },
    }),
    addFavorite: builder.mutation({
      query: (eventId) => ({
        url: `/likes/${eventId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Favorites', 'FavoritesCounts'],
      async onQueryStarted(eventId, { dispatch, getState, queryFulfilled }) {
        const prev = getState().favorites.ids;
        const next = prev.includes(eventId) ? prev : [...prev, eventId];
        dispatch(setFavorites(next));
        try {
          await queryFulfilled;
        } catch {
          dispatch(setFavorites(prev));
        }
      },
    }),
    removeFavorite: builder.mutation({
      query: (eventId) => ({
        url: `/likes/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Favorites', 'FavoritesCounts'],
      async onQueryStarted(eventId, { dispatch, getState, queryFulfilled }) {
        const prev = getState().favorites.ids;
        const next = prev.filter((id) => id !== eventId);
        dispatch(setFavorites(next));
        try {
          await queryFulfilled;
        } catch {
          dispatch(setFavorites(prev));
        }
      },
    }),
    getFavoritesCounts: builder.query({
      query: ({ eventIds, organizerId } = {}) => ({
        url: '/likes/counts',
        method: 'GET',
        params: {
          eventIds: Array.isArray(eventIds) ? eventIds.join(',') : eventIds,
          organizerId,
        },
      }),
      providesTags: ['FavoritesCounts'],
    }),
  }),
});

export const {
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useGetFavoritesCountsQuery,
} = favoritesApi;





