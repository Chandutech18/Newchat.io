import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../utils/api';

export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await API.post('/auth/login', data);
    localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Login failed'); }
});

export const signupUser = createAsyncThunk('auth/signup', async (data, { rejectWithValue }) => {
  try {
    const res = await API.post('/auth/signup', data);
    localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Signup failed'); }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await API.post('/auth/logout');
    localStorage.removeItem('user');
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (data, { rejectWithValue }) => {
  try {
    const res = await API.put('/auth/profile', data);
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const updated = { ...stored, ...res.data };
    localStorage.setItem('user', JSON.stringify(updated));
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const uploadAvatar = createAsyncThunk('auth/uploadAvatar', async (formData, { rejectWithValue }) => {
  try {
    const res = await API.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const updated = { ...stored, avatar: res.data.avatar };
    localStorage.setItem('user', JSON.stringify(updated));
    return res.data.avatar;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const stored = localStorage.getItem('user');
const initialUser = stored ? JSON.parse(stored) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: '',
    theme: localStorage.getItem('theme') || 'light',
  },
  reducers: {
    reset: (state) => { state.isLoading = false; state.isError = false; state.isSuccess = false; state.message = ''; },
    setOnlineStatus: (state, action) => { if (state.user) state.user.status = action.payload; },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', state.theme);
    },
    updateUserAvatar: (state, action) => { if (state.user) state.user.avatar = action.payload; },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending, (s) => { s.isLoading = true; s.isError = false; s.isSuccess = false; })
     .addCase(loginUser.fulfilled, (s, a) => { s.isLoading = false; s.isSuccess = true; s.user = a.payload; })
     .addCase(loginUser.rejected, (s, a) => { s.isLoading = false; s.isError = true; s.isSuccess = false; s.message = a.payload; s.user = null; })
     .addCase(signupUser.pending, (s) => { s.isLoading = true; s.isError = false; s.isSuccess = false; })
     .addCase(signupUser.fulfilled, (s, a) => { s.isLoading = false; s.isSuccess = true; s.user = a.payload; })
     .addCase(signupUser.rejected, (s, a) => { s.isLoading = false; s.isError = true; s.isSuccess = false; s.message = a.payload; s.user = null; })
     .addCase(logoutUser.fulfilled, (s) => { s.user = null; s.isSuccess = false; })
     .addCase(updateProfile.fulfilled, (s, a) => { s.user = { ...s.user, ...a.payload }; })
     .addCase(uploadAvatar.fulfilled, (s, a) => { if (s.user) s.user.avatar = a.payload; });
     
  },
});

export const { reset, setOnlineStatus, toggleTheme, updateUserAvatar } = authSlice.actions;
export default authSlice.reducer;
