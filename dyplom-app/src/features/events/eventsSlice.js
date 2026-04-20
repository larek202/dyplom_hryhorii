import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [],
  selectedEventId: null,
  filter: 'all',
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    selectEvent(state, action) {
      state.selectedEventId = action.payload;
    },
    setFilter(state, action) {
      state.filter = action.payload;
    },
    addEvent(state, action) {
      state.list.push(action.payload);
    },
  },
});

export const { selectEvent, setFilter, addEvent } = eventsSlice.actions;
export default eventsSlice.reducer;




