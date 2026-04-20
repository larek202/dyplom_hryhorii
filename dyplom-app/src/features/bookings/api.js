import { createApi } from '@reduxjs/toolkit/query/react';
import api from '../../services/api';
import { setBookings, addBooking, cancelBooking } from './bookingsSlice';

const normalizeBooking = (b) => {
  if (!b) return b;
  const eventIdObj = b.eventId && typeof b.eventId === 'object' ? b.eventId : null;
  const eventId = eventIdObj?._id || b.eventId;
  return {
    ...b,
    eventId: eventId?.toString?.() ?? eventId,
    event: eventIdObj || b.event, // сохраняем вложенный объект события, если пришёл populate
  };
};

export const bookingsApi = createApi({
  reducerPath: 'bookingsApi',
  baseQuery: async ({ url, method = 'GET', body, params }) => {
    try {
      const response = await api({
        url,
        method,
        data: body,
        params,
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
  tagTypes: ['Bookings'],
  endpoints: (builder) => ({
    getBookings: builder.query({
      query: (params = {}) => ({
        url: '/bookings',
        method: 'GET',
        params,
      }),
      providesTags: ['Bookings'],
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // jeśli zapytanie dotyczy organizatora (organizerId) — nie nadpisujemy listy użytkownika
          if (args && args.organizerId) return;
          const list = Array.isArray(data)
            ? data.map(normalizeBooking)
            : Array.isArray(data?.bookings)
              ? data.bookings.map(normalizeBooking)
              : [];
          dispatch(setBookings(list));
        } catch {
          // ignore
        }
      },
      transformResponse: (response) =>
        Array.isArray(response?.bookings)
          ? response.bookings.map(normalizeBooking)
          : Array.isArray(response)
            ? response.map(normalizeBooking)
            : [],
    }),
    createBooking: builder.mutation({
      query: ({ eventId, seats = 1 }) => ({
        url: `/bookings/${eventId}`,
        method: 'POST',
        body: { seats },
      }),
      invalidatesTags: ['Bookings'],
      async onQueryStarted(args, { dispatch, queryFulfilled, getState }) {
        const prev = getState().bookings.list || [];
        const userId = getState().auth.user?._id || getState().auth.user?.id;
        const cacheKey = { userId };
        try {
          const { data } = await queryFulfilled;
          if (data?.booking) {
            const next = [
              ...prev.filter(
                (b) =>
                  (b._id || b.id || b.eventId) !==
                  (data.booking._id || data.booking.id || data.booking.eventId)
              ),
              normalizeBooking(data.booking),
            ];
            dispatch(setBookings(next));
            dispatch(
              bookingsApi.util.updateQueryData('getBookings', cacheKey, () => next)
            );
          }
        } catch (error) {
          const serverSaysExists = error?.error?.data?.error === 'Rezerwacja już istnieje';
          if (serverSaysExists) {
            await dispatch(bookingsApi.endpoints.getBookings.initiate(cacheKey)).unwrap().catch(() => {});
            return;
          }
          // rollback on any other error
          dispatch(setBookings(prev));
          dispatch(
            bookingsApi.util.updateQueryData('getBookings', cacheKey, () => prev)
          );
        }
      },
    }),
    deleteBooking: builder.mutation({
      query: ({ eventId }) => ({
        url: `/bookings/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Bookings'],
      async onQueryStarted({ eventId }, { dispatch, queryFulfilled, getState }) {
        const prev = getState().bookings.list;
        const userId = getState().auth.user?._id || getState().auth.user?.id;
        const cacheKey = { userId };
        const next = prev.filter((b) => (b.eventId?._id || b.eventId) !== eventId);
        try {
          await queryFulfilled;
          dispatch(setBookings(next));
          dispatch(
            bookingsApi.util.updateQueryData('getBookings', cacheKey, () => next)
          );
        } catch {
          // keep prev on error
        }
      },
    }),
  }),
});

export const { useGetBookingsQuery, useCreateBookingMutation, useDeleteBookingMutation } = bookingsApi;




