import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('testyari_token');
const user = localStorage.getItem('testyari_user');

const initialState = {
  user: user ? JSON.parse(user) : null,
  token: token || null,
  isAuthenticated: !!token,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('testyari_token', token);
      localStorage.setItem('testyari_user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('testyari_token');
      localStorage.removeItem('testyari_user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
