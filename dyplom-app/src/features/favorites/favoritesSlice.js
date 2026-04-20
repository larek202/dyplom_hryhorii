import { createSlice } from '@reduxjs/toolkit';
import { logout } from '../auth';

const initialState = {
  ids: [], // пусто по умолчанию, чтобы профиль не показывал фиктивное 1
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    addFavorite(state, action) {
      if (!state.ids.includes(action.payload)) {
        state.ids.push(action.payload);
      }
    },
    removeFavorite(state, action) {
      state.ids = state.ids.filter((id) => id !== action.payload);
    },
    setFavorites(state, action) {
      state.ids = Array.isArray(action.payload) ? action.payload : [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const { addFavorite, removeFavorite, setFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;




