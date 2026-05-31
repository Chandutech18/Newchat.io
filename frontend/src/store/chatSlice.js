import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../utils/api';

export const fetchChats = createAsyncThunk('chat/fetchChats', async (_, { rejectWithValue }) => {
  try {
    const res = await API.get('/chat');
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const accessChat = createAsyncThunk('chat/accessChat', async (userId, { rejectWithValue }) => {
  try {
    const res = await API.post('/chat', { userId });
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const createGroupChat = createAsyncThunk('chat/createGroup', async (data, { rejectWithValue }) => {
  try {
    const res = await API.post('/chat/group', data);
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async ({ chatId, page = 1 }, { rejectWithValue }) => {
  try {
    const res = await API.get(`/message/${chatId}?page=${page}&limit=40`);
    return { messages: res.data, page };
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const sendMessage = createAsyncThunk('chat/sendMessage', async (formData, { rejectWithValue }) => {
  try {
    const res = await API.post('/message', formData, {
      headers: { 'Content-Type': formData instanceof FormData ? 'multipart/form-data' : 'application/json' }
    });
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const searchUsers = createAsyncThunk('chat/searchUsers', async (query, { rejectWithValue }) => {
  try {
    const res = await API.get(`/user?search=${query}`);
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    selectedChat: null,
    messages: [],
    searchResults: [],
    onlineUsers: [],
    notification: [],
    isLoading: false,
    messagesLoading: false,
    hasMoreMessages: true,
  },
  reducers: {
    setSelectedChat: (s, a) => { s.selectedChat = a.payload; s.messages = []; s.hasMoreMessages = true; },
    addMessage: (s, a) => { s.messages.push(a.payload); },
    updateMessage: (s, a) => {
      const idx = s.messages.findIndex(m => m._id === a.payload._id);
      if (idx !== -1) s.messages[idx] = a.payload;
    },
    removeMessage: (s, a) => { s.messages = s.messages.filter(m => m._id !== a.payload); },
    addNotification: (s, a) => { s.notification.unshift(a.payload); },
    clearNotification: (s, a) => { s.notification = s.notification.filter(n => n.chat._id !== a.payload); },
    setOnlineUsers: (s, a) => { s.onlineUsers = a.payload; },
    addOnlineUser: (s, a) => { if (!s.onlineUsers.includes(a.payload)) s.onlineUsers.push(a.payload); },
    removeOnlineUser: (s, a) => { s.onlineUsers = s.onlineUsers.filter(id => id !== a.payload); },
    updateChatLatestMessage: (s, a) => {
      const idx = s.chats.findIndex(c => c._id === a.payload.chat._id);
      if (idx !== -1) {
        s.chats[idx].latestMessage = a.payload;
        // Move to top
        const [chat] = s.chats.splice(idx, 1);
        s.chats.unshift(chat);
      }
    },
    clearSearchResults: (s) => { s.searchResults = []; },
  },
  extraReducers: (b) => {
    b.addCase(fetchChats.pending, (s) => { s.isLoading = true; })
     .addCase(fetchChats.fulfilled, (s, a) => { s.isLoading = false; s.chats = a.payload; })
     .addCase(fetchChats.rejected, (s) => { s.isLoading = false; })
     .addCase(accessChat.fulfilled, (s, a) => {
       if (!s.chats.find(c => c._id === a.payload._id)) s.chats.unshift(a.payload);
       s.selectedChat = a.payload;
     })
     .addCase(createGroupChat.fulfilled, (s, a) => { s.chats.unshift(a.payload); s.selectedChat = a.payload; })
     .addCase(fetchMessages.pending, (s, a) => {
       if (a.meta.arg.page === 1) s.messagesLoading = true;
     })
     .addCase(fetchMessages.fulfilled, (s, a) => {
       s.messagesLoading = false;
       if (a.payload.page === 1) s.messages = a.payload.messages;
       else s.messages = [...a.payload.messages, ...s.messages];
       if (a.payload.messages.length < 40) s.hasMoreMessages = false;
     })
     .addCase(fetchMessages.rejected, (s) => { s.messagesLoading = false; })
     .addCase(sendMessage.fulfilled, (s, a) => { s.messages.push(a.payload); })
     .addCase(searchUsers.fulfilled, (s, a) => { s.searchResults = a.payload; });
  },
});

export const {
  setSelectedChat, addMessage, updateMessage, removeMessage,
  addNotification, clearNotification, setOnlineUsers,
  addOnlineUser, removeOnlineUser, updateChatLatestMessage, clearSearchResults
} = chatSlice.actions;
export default chatSlice.reducer;
