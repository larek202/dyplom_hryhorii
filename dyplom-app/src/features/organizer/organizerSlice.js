import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  managedEvents: [
    {
      id: 'event-99',
      title: 'Trening organizatora',
      participants: 12,
      maxParticipants: 20,
      views: 420,
    },
  ],
  stats: {
    bookings: 18,
    favorites: 27,
  },
};

const organizerSlice = createSlice({
  name: 'organizer',
  initialState,
  reducers: {
    addManagedEvent(state, action) {
      state.managedEvents.push(action.payload);
    },
  },
});

export const { addManagedEvent } = organizerSlice.actions;
export default organizerSlice.reducer;




