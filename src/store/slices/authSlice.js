import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: JSON.parse(localStorage.getItem('user')) || null, // Persist user info if needed
    token: localStorage.getItem('token') || null,
    refreshToken: localStorage.getItem('refresh_token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
};
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user, token, refreshToken } = action.payload;
            state.user = user;
            state.token = token;
            if (refreshToken) state.refreshToken = refreshToken;
            state.isAuthenticated = true;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        },
        // Used for the intermediate step (Selection Token)
        setTempToken: (state, action) => {
            state.token = action.payload;
            localStorage.setItem('temp_token', action.payload);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem("temp_token");
        },
    },
});

export const { setCredentials, setTempToken, logout } = authSlice.actions;

export default authSlice.reducer;