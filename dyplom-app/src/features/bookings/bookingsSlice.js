import { createSlice } from '@reduxjs/toolkit';
import { logout } from '../auth';

const initialState = {
  list: [], // стартуем с пустого списка, чтобы счетчики не показывали фиктивные данные
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setBookings(state, action) {
      state.list = Array.isArray(action.payload) ? action.payload : [];
    },
    addBooking(state, action) {
      state.list.push(action.payload);
    },
    cancelBooking(state, action) {
      state.list = state.list.filter((booking) => booking.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const { setBookings, addBooking, cancelBooking } = bookingsSlice.actions;
export default bookingsSlice.reducer;




