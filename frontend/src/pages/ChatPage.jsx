import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  FiArchive,
  FiArrowLeft,
  FiBookmark,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiEdit3,
  FiFile,
  FiHeart,
  FiImage,
  FiLogOut,
  FiMessageCircle,
  FiMic,
  FiMoon,
  FiMoreHorizontal,
  FiPaperclip,
  FiPhone,
  FiSearch,
  FiSend,
  FiSettings,
  FiShare2,
  FiSmile,
  FiStar,
  FiSun,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import API from '../utils/api';
import { SERVER_URL } from '../utils/serverUrl';
import { logoutUser, toggleTheme } from '../store/authSlice';
import ProfileSettingsModal from '../components/profile/ProfileSettingsModal';

const socket = io(SERVER_URL, { autoConnect: false, withCredentials: true });
const EmojiPicker = lazy(() => import('emoji-picker-react'));
const reactions = ['❤️', '👍', '😂', '😮', '😢'];
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const inferMessageType = (file) => {
  if (!file) return 'text';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
};

const formatTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    : '';

const formatDay = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return formatTime(value);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

const getOtherUser = (currentUser, users = []) => {
  if (!currentUser || users.length < 2) return users[0] || null;
  return users.find((item) => item._id !== currentUser._id) || users[0];
};

const getAvatar = (person) => {
  if (person?.avatar) return person.avatar;
  const name = encodeURIComponent(person?.username || person?.chatName || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&size=128&bold=true`;
};

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const ChatPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const toastTimerRef = useRef(null);
  const skipNextScrollRef = useRef(false);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callStateRef = useRef(null);
  const callElapsedRef = useRef(0);

  const { user, theme } = useSelector((state) => state.auth);
  const [showSplash, setShowSplash] = useState(true);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [contactUsers, setContactUsers] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingChatId, setTypingChatId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [fileAccept, setFileAccept] = useState('image/*,video/*,audio/*,.pdf,.doc,.docx,.txt');
  const [fileCapture, setFileCapture] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('chats');
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [callState, setCallState] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callElapsed, setCallElapsed] = useState(0);
  const [callHistory, setCallHistory] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recorder, setRecorder] = useState(null);
  const [recording, setRecording] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localMediaReady, setLocalMediaReady] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraMuted, setCameraMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [callQuality, setCallQuality] = useState('idle');
  const [cameraFacing, setCameraFacing] = useState('user');
  const [speakerMode, setSpeakerMode] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(''), 2200);
  }, []);

  const handleApiError = useCallback((error, fallback = 'Something went wrong') => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('user');
      showToast('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    showToast(getApiErrorMessage(error, fallback));
  }, [navigate, showToast]);

  const isDark = theme === 'dark';
  const currentChatUser = selectedChat?.isGroupChat ? null : getOtherUser(user, selectedChat?.users);
  const selectedName = selectedChat?.isGroupChat ? selectedChat.chatName : currentChatUser?.username;
  const profilePath = currentChatUser ? `/u/${currentChatUser.username}` : null;
  const pageTitle = {
    chats: 'Messages',
    calls: 'Calls',
    contacts: 'Contacts',
    groups: 'Groups',
    saved: 'Saved',
    archived: 'Archived',
    favorites: 'Starred',
  }[activeSection] || 'Messages';

  const filteredChats = useMemo(() => {
    const source = chats.filter((chat) => {
      const label = chat.isGroupChat ? chat.chatName : getOtherUser(user, chat.users)?.username || '';
      const unread = chat.unreadCount?.find((item) => item.user === user?._id)?.count || 0;
      const archived = chat.archivedBy?.some((id) => id === user?._id || id?._id === user?._id);
      if (activeSection === 'archived') return archived && label.toLowerCase().includes(search.toLowerCase());
      if (archived && activeSection !== 'archived') return false;
      if (filter === 'unread' && !unread) return false;
      if (filter === 'groups' && !chat.isGroupChat) return false;
      if (filter === 'favorites') return chat.pinnedMessages?.length;
      return label.toLowerCase().includes(search.toLowerCase());
    });

    return source.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [activeSection, chats, filter, search, user]);

  const visibleContacts = useMemo(() => (
    contactUsers
      .filter((person) => {
        const value = `${person.username || ''} ${person.email || ''}`.toLowerCase();
        return value.includes(search.toLowerCase());
      })
      .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
  ), [contactUsers, search]);

  const visibleMessages = useMemo(() => {
    if (!chatSearchOpen || !search.trim()) return messages;
    const value = search.toLowerCase();
    return messages.filter((message) =>
      `${message.content || ''} ${message.sender?.username || ''} ${message.fileName || ''}`.toLowerCase().includes(value)
    );
  }, [chatSearchOpen, messages, search]);

  const attachmentPreview = useMemo(() => (
    attachment && (attachment.type.startsWith('image/') || attachment.type.startsWith('video/'))
      ? URL.createObjectURL(attachment)
      : ''
  ), [attachment]);

  useEffect(() => () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
  }, [attachmentPreview]);

  const attachMediaStreams = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalMediaReady(false);
    setMicMuted(false);
    setCameraMuted(false);
    setScreenSharing(false);
  }, []);

  const updateCallRecord = useCallback((callId, status, duration = 0) => {
    if (!callId) return;
    API.put(`/call/${callId}`, { status, duration }).catch(() => {});
  }, []);

  const closePeerConnection = useCallback(() => {
    peerRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerRef.current?.close();
    peerRef.current = null;
    setCallQuality('idle');
  }, []);

  const getCallPeerId = useCallback((state = callState) => {
    if (!state) return null;
    return state.direction === 'incoming' ? state.from?._id || state.from : state.to;
  }, [callState]);

  const createPeerConnection = useCallback((remoteUserId) => {
    const peer = new RTCPeerConnection(rtcConfig);
    remoteStreamRef.current = new MediaStream();

    peer.onicecandidate = (event) => {
      if (event.candidate && remoteUserId) {
        socket.emit('ice candidate', { to: remoteUserId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remoteStreamRef.current.addTrack(track));
      attachMediaStreams();
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      setCallQuality(state === 'connected' ? 'good' : state === 'connecting' ? 'connecting' : state);
      if (state === 'failed') showToast('Call connection failed. Please try again.');
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current);
    });

    peerRef.current = peer;
    return peer;
  }, [attachMediaStreams, showToast]);

  const prepareLocalMedia = useCallback(async (callType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Media devices are not supported in this browser');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
    });

    localStreamRef.current = stream;
    setLocalMediaReady(true);
    window.setTimeout(attachMediaStreams, 0);
    return stream;
  }, [attachMediaStreams]);

  useEffect(() => {
    attachMediaStreams();
  }, [attachMediaStreams, callState, localMediaReady]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callElapsedRef.current = callElapsed;
  }, [callElapsed]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    socket.connect();
    socket.emit('setup', user);

    const handleMessage = (message) => {
      setChats((prev) =>
        prev.map((chat) => (chat._id === message.chat._id ? { ...chat, latestMessage: message } : chat))
      );

      if (selectedChat?._id === message.chat._id) {
        setMessages((prev) => [...prev, message]);
        socket.emit('message read', { chatId: selectedChat._id, userId: user._id });
      }
    };

    const handleReaction = (message) => {
      setMessages((prev) => prev.map((item) => (item._id === message._id ? message : item)));
    };

    const handleDelivered = ({ messageId, status }) => {
      setMessages((prev) => prev.map((item) => (item._id === messageId ? { ...item, status } : item)));
    };

    const handleRead = ({ chatId, userId }) => {
      setMessages((prev) =>
        prev.map((item) =>
          item.chat?._id === chatId || item.chat === chatId
            ? { ...item, status: item.sender?._id === userId ? item.status : 'seen', readBy: [...new Set([...(item.readBy || []), userId])] }
            : item
        )
      );
      setChats((prev) =>
        prev.map((chat) =>
          chat._id === chatId
            ? { ...chat, unreadCount: (chat.unreadCount || []).map((entry) => entry.user === userId ? { ...entry, count: 0 } : entry) }
            : chat
        )
      );
    };

    const handleNotification = ({ title, body }) => {
      setUnreadNotifications((count) => count + 1);
      showToast(body ? `${title}: ${body}` : title);
      if ('Notification' in window && window.Notification.permission === 'granted' && document.hidden) {
        new window.Notification(title || 'Chat.io', { body });
      }
    };

    socket.on('message received', handleMessage);
    socket.on('message reaction', handleReaction);
    socket.on('message edited', handleReaction);
    socket.on('message delivered', handleDelivered);
    socket.on('message read', handleRead);
    socket.on('message deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((item) => item._id !== messageId));
    });
    socket.on('typing', (chatId) => setTypingChatId(chatId));
    socket.on('stop typing', () => setTypingChatId(null));
    socket.on('user online', (userId) => setOnlineUsers((prev) => [...new Set([...prev, userId])]));
    socket.on('online users', (userIds) => setOnlineUsers(userIds));
    socket.on('user offline', (userId) => setOnlineUsers((prev) => prev.filter((id) => id !== userId)));
    socket.on('notification', handleNotification);
    socket.on('incoming call', (payload) => {
      setCallState({ ...payload, direction: 'incoming', status: 'ringing' });
      setCallQuality('ringing');
    });
    socket.on('call rejected', ({ callId } = {}) => {
      updateCallRecord(callId || callStateRef.current?.callId, 'rejected');
      closePeerConnection();
      stopLocalMedia();
      setCallState(null);
      setCallStartedAt(null);
      setCallElapsed(0);
    });
    socket.on('call ended', ({ callId, duration } = {}) => {
      updateCallRecord(callId || callStateRef.current?.callId, 'ended', duration || callElapsedRef.current);
      closePeerConnection();
      stopLocalMedia();
      setCallState(null);
      setCallStartedAt(null);
      setCallElapsed(0);
    });
    socket.on('call accepted', async ({ signal, callId } = {}) => {
      if (signal && peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal)).catch(() => {
          showToast('Could not connect call');
        });
      }
      updateCallRecord(callId || callStateRef.current?.callId, 'accepted');
      setCallElapsed(0);
      setCallStartedAt(Date.now());
      setCallState((state) => state ? { ...state, status: 'connected' } : state);
    });
    socket.on('ice candidate', async ({ candidate } = {}) => {
      if (candidate && peerRef.current) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [closePeerConnection, navigate, selectedChat?._id, showToast, stopLocalMedia, updateCallRecord, user]);

  useEffect(() => {
    if (!user) return;
    API.get('/notification')
      .then(({ data }) => setUnreadNotifications(data.unreadCount || 0))
      .catch(() => {});

    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;
      setChatLoading(true);
      try {
        const { data } = await API.get('/chat');
        setChats(data);
        setSelectedChat((current) => current || data[0] || null);
      } catch (error) {
        setChats([]);
        setSelectedChat(null);
        handleApiError(error, 'Could not load chats');
      } finally {
        setChatLoading(false);
      }
    };

    loadChats();
  }, [handleApiError, user]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChat) return;
      setMessagesLoading(true);
      try {
        const { data } = await API.get(`/message/${selectedChat._id}?page=1&limit=40`);
        setMessages(data);
        setMessagePage(1);
        setHasMoreMessages(data.length === 40);
        socket.emit('join chat', selectedChat._id);
        socket.emit('message read', { chatId: selectedChat._id, userId: user._id });
      } catch (error) {
        setMessages([]);
        handleApiError(error, 'Could not load messages');
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
    return () => {
      if (selectedChat) socket.emit('leave chat', selectedChat._id);
    };
  }, [handleApiError, selectedChat, user?._id]);

  useEffect(() => {
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChat]);

  useEffect(() => {
    const loadSelectedProfile = async () => {
      if (!currentChatUser?.username) {
        setSelectedProfile(null);
        return;
      }

      try {
        const { data } = await API.get(`/user/profile/${currentChatUser.username}`);
        setSelectedProfile(data);
      } catch (error) {
        setSelectedProfile(null);
        handleApiError(error, 'Could not load profile');
      }
    };

    loadSelectedProfile();
  }, [currentChatUser?.username, handleApiError]);

  useEffect(() => {
    const loadContacts = async () => {
      if (!user || activeSection !== 'contacts') return;
      setContactsLoading(true);
      try {
        const [{ data: profile }, { data: users }] = await Promise.all([
          API.get('/user/me/profile'),
          API.get('/user/all'),
        ]);

        const requestIds = new Set((profile.connectionRequests || []).map((person) => person._id));
        const merged = [
          ...(profile.connections || []),
          ...users.filter((person) => person._id !== user._id && !requestIds.has(person._id)),
        ];
        const unique = Array.from(new Map(merged.map((person) => [person._id, person])).values());
        setContactRequests(profile.connectionRequests || []);
        setContactUsers(unique);
      } catch (error) {
        setContactRequests([]);
        setContactUsers([]);
        handleApiError(error, 'Could not load contacts');
      } finally {
        setContactsLoading(false);
      }
    };

    loadContacts();
  }, [activeSection, handleApiError, user]);

  useEffect(() => {
    const loadCalls = async () => {
      if (!user || activeSection !== 'calls') return;
      setCallsLoading(true);
      try {
        const { data } = await API.get('/call/history');
        setCallHistory(data);
      } catch (error) {
        setCallHistory([]);
        handleApiError(error, 'Could not load call history');
      } finally {
        setCallsLoading(false);
      }
    };

    loadCalls();
  }, [activeSection, handleApiError, user]);

  useEffect(() => {
    if (!callStartedAt) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCallElapsed(Math.floor((Date.now() - callStartedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartedAt]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setUserResults([]);
        return;
      }

      try {
        const { data } = await API.get(`/user?search=${encodeURIComponent(search)}`);
        setUserResults(data);
      } catch (error) {
        setUserResults([]);
        handleApiError(error, 'Search failed');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [handleApiError, search]);

  const selectUser = async (person) => {
    try {
      const { data } = await API.post('/chat', { userId: person._id });
      setChats((prev) => (prev.some((chat) => chat._id === data._id) ? prev : [data, ...prev]));
      setSelectedChat(data);
      setUserResults([]);
      setSearch('');
      return data;
    } catch (error) {
      handleApiError(error, 'Could not open chat');
      return null;
    }
  };

  const switchSection = (section) => {
    setActiveSection(section);
    if (section === 'groups') setFilter('groups');
    else if (section === 'favorites') setFilter('favorites');
    else if (section === 'chats') setFilter('all');
  };

  const pickFile = (accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt', capture = '') => {
    setFileAccept(accept);
    setFileCapture(capture);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleQuickAction = (label) => {
    if (label === 'Photo') pickFile('image/*');
    else if (label === 'Camera') pickFile('image/*', 'environment');
    else if (label === 'Video') pickFile('video/*');
    else if (label === 'Document') pickFile('.pdf,.doc,.docx,.txt');
    else if (label === 'Audio') (recording ? stopVoiceNote : startVoiceNote)();
    else if (label === 'Contact') setActiveSection('contacts');
    else if (label === 'GIF') showToast('GIF picker coming soon');
  };

  const openContactChat = async (person) => {
    const chat = await selectUser(person);
    if (!chat) return;
    setActiveSection('chats');
    showToast(`Chat opened with ${person.username}`);
  };

  const acceptConnectionRequest = async (person) => {
    try {
      await API.post(`/user/${person._id}/accept`);
      setContactRequests((prev) => prev.filter((item) => item._id !== person._id));
      setContactUsers((prev) => (prev.some((item) => item._id === person._id) ? prev : [person, ...prev]));
      showToast(`${person.username} added to contacts`);
    } catch (error) {
      handleApiError(error, 'Could not accept request');
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedChat || (!messageDraft.trim() && !attachment)) return;

    const payload = attachment ? new FormData() : {};
    const content = messageDraft.trim();
    const type = inferMessageType(attachment);

    if (attachment) {
      payload.append('file', attachment);
      payload.append('content', content);
      payload.append('chatId', selectedChat._id);
      payload.append('type', type);
      if (replyTo) payload.append('replyTo', replyTo._id);
    } else {
      payload.content = content;
      payload.chatId = selectedChat._id;
      payload.type = type;
      if (replyTo) payload.replyTo = replyTo._id;
    }

    try {
      setUploading(!!attachment);
      setUploadProgress(0);
      const uploadConfig = attachment
        ? {
            onUploadProgress: (progressEvent) => {
              const total = progressEvent.total || attachment.size || 1;
              setUploadProgress(Math.round((progressEvent.loaded * 100) / total));
            },
          }
        : undefined;
      let { data } = editing
        ? await API.put(`/message/${editing._id}`, { content })
        : await API.post('/message', payload, uploadConfig);

      if (editing) {
        setMessages((prev) => prev.map((item) => (item._id === data._id ? data : item)));
        socket.emit('message edited', data);
      } else {
        socket.emit('new message', data);
        setMessages((prev) => [...prev, data]);
        setChats((prev) =>
          prev.map((chat) => (chat._id === data.chat._id ? { ...chat, latestMessage: data } : chat))
        );
      }

      setMessageDraft('');
      setAttachment(null);
      setReplyTo(null);
      setEditing(null);
      setUploadProgress(0);
    } catch (error) {
      handleApiError(error, editing ? 'Could not edit message' : 'Could not send message');
    } finally {
      setUploading(false);
      socket.emit('stop typing', selectedChat._id);
    }
  };

  const handleTyping = (value) => {
    setMessageDraft(value);
    if (!selectedChat) return;

    socket.emit('typing', selectedChat._id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('stop typing', selectedChat._id), 1200);
  };

  const loadOlderMessages = async () => {
    if (!selectedChat || olderMessagesLoading || !hasMoreMessages) return;
    const nextPage = messagePage + 1;
    setOlderMessagesLoading(true);
    try {
      const { data } = await API.get(`/message/${selectedChat._id}?page=${nextPage}&limit=40`);
      skipNextScrollRef.current = true;
      setMessages((prev) => [...data, ...prev]);
      setMessagePage(nextPage);
      setHasMoreMessages(data.length === 40);
    } catch (error) {
      handleApiError(error, 'Could not load older messages');
    } finally {
      setOlderMessagesLoading(false);
    }
  };

  const reactToMessage = async (message, emoji) => {
    try {
      const { data } = await API.post(`/message/${message._id}/react`, { emoji });
      setMessages((prev) => prev.map((item) => (item._id === data._id ? data : item)));
      socket.emit('message reaction', data);
    } catch (error) {
      handleApiError(error, 'Could not react to message');
    }
  };

  const forwardMessage = (message) => {
    const forwarded = message.content || message.fileName || message.fileUrl || 'Forwarded message';
    setMessageDraft((current) => `${current ? `${current}\n` : ''}${forwarded}`);
    showToast('Message ready to forward');
  };

  const deleteMessage = async (message, everyone = true) => {
    try {
      await API.delete(`/message/${message._id}/${everyone ? 'everyone' : 'me'}`);
      if (everyone) {
        setMessages((prev) =>
          prev.map((item) =>
            item._id === message._id ? { ...item, deletedForEveryone: true, content: 'This message was deleted' } : item
          )
        );
        socket.emit('message deleted', { chatId: selectedChat._id, messageId: message._id });
      } else {
        setMessages((prev) => prev.filter((item) => item._id !== message._id));
      }
    } catch (error) {
      handleApiError(error, 'Could not delete message');
    }
  };

  const togglePin = async (message) => {
    try {
      const { data } = await API.post(`/message/${message._id}/pin`);
      setMessages((prev) => prev.map((item) => (item._id === data._id ? data : item)));
      socket.emit('message edited', data);
      showToast(data.isPinned ? 'Message pinned' : 'Message unpinned');
    } catch (error) {
      handleApiError(error, 'Could not pin message');
    }
  };

  const toggleStar = async (message) => {
    try {
      const { data } = await API.post(`/message/${message._id}/star`);
      setMessages((prev) => prev.map((item) => (item._id === data._id ? data : item)));
      socket.emit('message edited', data);
      showToast(data.isStarred?.includes(user._id) ? 'Message starred' : 'Message unstarred');
    } catch (error) {
      handleApiError(error, 'Could not update starred message');
    }
  };

  const beginCall = async (callType) => {
    if (!currentChatUser) {
      showToast('Calls are available in one-to-one chats');
      return;
    }

    try {
      await prepareLocalMedia(callType);
      const { data: call } = await API.post('/call', { receiverId: currentChatUser._id, callType });
      const peer = createPeerConnection(currentChatUser._id);
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await peer.setLocalDescription(offer);
      const payload = {
        to: currentChatUser._id,
        from: user,
        signal: offer,
        callType,
        callId: call._id,
      };
      setCallState({ ...payload, direction: 'outgoing', status: 'calling' });
      setCallQuality('calling');
      socket.emit('call user', payload);
    } catch (error) {
      closePeerConnection();
      stopLocalMedia();
      showToast(error?.message || 'Could not start call. Check camera and microphone permissions.');
    }
  };

  const archiveSelectedChat = async () => {
    if (!selectedChat?._id) return;
    try {
      const { data } = await API.put(`/chat/${selectedChat._id}/archive`);
      setChats((prev) => prev.map((chat) => (chat._id === selectedChat._id ? data.chat : chat)));
      showToast(data.archived ? 'Chat archived' : 'Chat restored');
      setActiveSection(data.archived ? 'archived' : 'chats');
    } catch (error) {
      handleApiError(error, 'Could not archive chat');
    }
  };

  const blockCurrentUser = async () => {
    if (!currentChatUser?._id) return;
    try {
      const { data } = await API.put(`/user/${currentChatUser._id}/block`);
      setContactUsers((prev) => prev.filter((person) => person._id !== currentChatUser._id));
      showToast(data.blocked ? `${currentChatUser.username} blocked` : `${currentChatUser.username} unblocked`);
    } catch (error) {
      handleApiError(error, 'Could not block user');
    }
  };

  const requestConnection = async () => {
    if (!currentChatUser?._id) return;
    try {
      await API.post(`/user/${currentChatUser._id}/connect`);
      setSelectedProfile((profile) => profile ? { ...profile, hasRequested: true } : profile);
      showToast(`Connection request sent to ${currentChatUser.username}`);
    } catch (error) {
      handleApiError(error, 'Could not send connection request');
    }
  };

  const removeConnection = async () => {
    if (!currentChatUser?._id) return;
    try {
      await API.delete(`/user/${currentChatUser._id}/connect`);
      setSelectedProfile((profile) => profile ? { ...profile, isConnected: false, hasRequested: false } : profile);
      setContactUsers((prev) => prev.filter((person) => person._id !== currentChatUser._id));
      showToast(`${currentChatUser.username} removed from contacts`);
    } catch (error) {
      handleApiError(error, 'Could not remove contact');
    }
  };

  const acceptCall = async () => {
    const incomingCall = callStateRef.current;
    const remoteUserId = getCallPeerId(incomingCall);
    if (!incomingCall || !remoteUserId) return;

    try {
      await prepareLocalMedia(incomingCall.callType);
      const peer = createPeerConnection(remoteUserId);
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('call accepted', { to: remoteUserId, signal: answer, callId: incomingCall.callId });
      updateCallRecord(incomingCall.callId, 'accepted');
      setCallElapsed(0);
      setCallStartedAt(Date.now());
      setCallState((state) => state ? { ...state, status: 'connected' } : state);
      setCallQuality('connecting');
    } catch (error) {
      socket.emit('call rejected', { to: remoteUserId, callId: incomingCall.callId });
      updateCallRecord(incomingCall.callId, 'rejected');
      closePeerConnection();
      stopLocalMedia();
      setCallState(null);
      showToast(error?.message || 'Could not answer call. Check camera and microphone permissions.');
    }
  };

  const endCall = () => {
    const activeCall = callStateRef.current;
    const remoteUserId = getCallPeerId(activeCall);
    const duration = callElapsedRef.current;
    const status = activeCall?.direction === 'incoming' && !callStartedAt ? 'rejected' : 'ended';
    if (remoteUserId) {
      socket.emit(status === 'rejected' ? 'call rejected' : 'call ended', {
        to: remoteUserId,
        callId: activeCall?.callId,
        duration,
      });
    }
    updateCallRecord(activeCall?.callId, status, duration);
    closePeerConnection();
    stopLocalMedia();
    setCallState(null);
    setCallStartedAt(null);
    setCallElapsed(0);
  };

  const toggleMicrophone = () => {
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    const nextMuted = !micMuted;
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMicMuted(nextMuted);
  };

  const toggleCamera = () => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    const nextMuted = !cameraMuted;
    videoTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setCameraMuted(nextMuted);
  };

  const replaceVideoTrack = async (track) => {
    const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video');
    if (sender) await sender.replaceTrack(track);
    const stream = localStreamRef.current;
    stream?.getVideoTracks().forEach((oldTrack) => {
      stream.removeTrack(oldTrack);
      oldTrack.stop();
    });
    stream?.addTrack(track);
    attachMediaStreams();
  };

  const switchCamera = async () => {
    if (callState?.callType !== 'video') return;
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing }, audio: false });
      await replaceVideoTrack(stream.getVideoTracks()[0]);
      setCameraFacing(nextFacing);
      setCameraMuted(false);
    } catch {
      showToast('Could not switch camera on this device');
    }
  };

  const toggleScreenShare = async () => {
    if (!peerRef.current || callState?.callType !== 'video') return;
    if (screenSharing) {
      await switchCamera();
      setScreenSharing(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const [screenTrack] = displayStream.getVideoTracks();
      await replaceVideoTrack(screenTrack);
      setScreenSharing(true);
      screenTrack.onended = async () => {
        setScreenSharing(false);
        await switchCamera();
      };
    } catch {
      showToast('Screen sharing was cancelled');
    }
  };

  const toggleSpeaker = () => {
    const next = !speakerMode;
    setSpeakerMode(next);
    if (remoteAudioRef.current) remoteAudioRef.current.volume = next ? 1 : 0.35;
    if (remoteVideoRef.current) remoteVideoRef.current.volume = next ? 1 : 0.35;
  };

  const openCallFullscreen = () => {
    remoteVideoRef.current?.requestFullscreen?.();
  };

  const startVoiceNote = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      showToast('Voice recording is not supported in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAttachment(new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' }));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setRecording(true);
    } catch {
      showToast('Microphone permission is needed to record audio');
    }
  };

  const stopVoiceNote = () => {
    recorder?.stop();
    setRecorder(null);
    setRecording(false);
  };

  const logout = async () => {
    await dispatch(logoutUser()).unwrap().catch(() => localStorage.removeItem('user'));
    navigate('/login');
  };

  if (showSplash) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f5ef] text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="flex flex-col items-center gap-5">
          <div className="chatio-logo-pulse grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-[#25d366] via-[#5b5ff6] to-[#c13584] text-4xl font-black text-white shadow-2xl">
            C
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Chat.io</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Connecting your conversations</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? 'dark bg-slate-950 text-white' : 'bg-[#f7f5ef] text-slate-950'} h-[100dvh] overflow-hidden`}>
      <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[72px_minmax(280px,380px)_1fr] lg:grid-cols-[88px_minmax(320px,420px)_1fr_minmax(280px,360px)]">
        <aside className="hidden flex-col border-r border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 md:flex">
          <div className="grid h-20 place-items-center border-b border-black/5 dark:border-white/10">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#25d366] via-[#5b5ff6] to-[#c13584] font-black text-white shadow-lg">
              C
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-2 px-3 py-5 text-slate-500 dark:text-slate-300">
            {[
              [FiMessageCircle, 'Chats', 'all'],
              [FiPhone, 'Calls', 'calls'],
              [FiUser, 'Contacts', 'contacts'],
              [FiUsers, 'Groups', 'groups'],
              [FiBookmark, 'Saved', 'saved'],
              [FiArchive, 'Archived', 'archived'],
              [FiStar, 'Starred', 'favorites'],
              [FiSettings, 'Settings', 'settings'],
            ].map(([Icon, label, value]) => (
              <button
                key={label}
                onClick={() => value === 'settings' ? setShowProfileSettings(true) : switchSection(value === 'all' ? 'chats' : value)}
                className={`animated-button flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-white/10 ${
                  (showProfileSettings && value === 'settings') || activeSection === (value === 'all' ? 'chats' : value) || filter === value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : ''
                }`}
                title={label}
              >
                <Icon size={20} />
                <span className="hidden xl:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="flex flex-col items-center gap-3 border-t border-black/5 p-3 dark:border-white/10">
            <button onClick={() => setShowProfileSettings(true)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
              <img src={getAvatar(user)} alt={user?.username} className="h-10 w-10 rounded-full object-cover" />
              <span className="hidden min-w-0 flex-1 xl:block">
                <span className="block truncate text-sm font-bold">{user?.username}</span>
                <span className="block text-xs text-emerald-500">Online</span>
              </span>
            </button>
            <button
              onClick={() => dispatch(toggleTheme())}
              className="grid h-11 w-full place-items-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
              title="Toggle theme"
            >
              {isDark ? <FiSun /> : <FiMoon />}
            </button>
            <button onClick={logout} className="grid h-11 w-11 place-items-center rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950" title="Logout">
              <FiLogOut />
            </button>
          </div>
        </aside>

        <section className={`${selectedChat ? 'hidden md:flex' : 'flex'} min-w-0 flex-col border-r border-black/5 bg-white dark:border-white/10 dark:bg-slate-900`}>
          <header className="flex h-20 items-center justify-between border-b border-black/5 px-5 dark:border-white/10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Chat.io</p>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{pageTitle}</h1>
                {unreadNotifications > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-black text-white">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => dispatch(toggleTheme())} className="animated-button grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200 md:hidden" title="Toggle theme">
                {isDark ? <FiSun /> : <FiMoon />}
              </button>
              <button onClick={() => setShowProfileSettings(true)} className="animated-button grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200 md:hidden" title="Settings">
                <FiSettings />
              </button>
              <button onClick={() => { setActiveSection('contacts'); setSearch(''); }} className="animated-button grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" title="New chat">
                <FiEdit3 />
              </button>
            </div>
          </header>

          <div className="flex gap-2 overflow-x-auto border-b border-black/5 px-4 py-3 text-xs dark:border-white/10 md:hidden">
            {[
              [FiMessageCircle, 'Chats', 'chats'],
              [FiPhone, 'Calls', 'calls'],
              [FiUser, 'Contacts', 'contacts'],
              [FiUsers, 'Groups', 'groups'],
              [FiSettings, 'Settings', 'settings'],
            ].map(([Icon, label, value]) => (
              <button
                key={label}
                onClick={() => value === 'settings' ? setShowProfileSettings(true) : switchSection(value)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-2 font-bold ${
                  activeSection === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Icon /> {label}
              </button>
            ))}
          </div>

          <div className="space-y-4 border-b border-black/5 p-5 dark:border-white/10">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <FiSearch className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Search people or chats"
              />
              <FiUserPlus className="text-indigo-500" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
              {[
                ['all', 'All'],
                ['unread', 'Unread'],
                ['groups', 'Groups'],
                ['favorites', 'Favorites'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => { setActiveSection(value === 'groups' ? 'groups' : value === 'favorites' ? 'favorites' : 'chats'); setFilter(value); }}
                  className={`animated-button rounded-full px-4 py-2 font-medium transition ${
                    filter === value
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {userResults.length > 0 && (
              <div className="mb-3 rounded-3xl bg-indigo-50 p-2 dark:bg-indigo-950/40">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-indigo-500">People</p>
                {userResults.map((person) => (
                  <button key={person._id} onClick={() => selectUser(person)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-white dark:hover:bg-slate-800">
                    <img src={getAvatar(person)} alt={person.username} className="h-11 w-11 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="font-semibold">{person.username}</p>
                      <p className="truncate text-xs text-slate-500">/u/{person.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeSection === 'contacts' ? (
              <div className="space-y-3">
                {contactsLoading ? (
                  [1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />)
                ) : (
                  <>
                    {contactRequests.length > 0 && (
                      <div className="rounded-3xl bg-emerald-50 p-2 dark:bg-emerald-950/30">
                        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-600">Requests</p>
                        {contactRequests.map((person) => (
                          <div key={person._id} className="flex items-center gap-3 rounded-2xl p-3">
                            <img src={getAvatar(person)} alt={person.username} className="h-11 w-11 rounded-full object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{person.username}</p>
                              <p className="truncate text-xs text-slate-500">{person.email}</p>
                            </div>
                            <button onClick={() => acceptConnectionRequest(person)} className="animated-button rounded-full bg-emerald-500 px-3 py-2 text-xs font-bold text-white">Accept</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {visibleContacts.length ? visibleContacts.map((person) => {
                      const connected = contactRequests.every((request) => request._id !== person._id);
                      return (
                        <button key={person._id} onClick={() => openContactChat(person)} className="animated-button flex w-full items-center gap-3 rounded-3xl p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                          <div className="relative">
                            <img src={getAvatar(person)} alt={person.username} className="h-12 w-12 rounded-full object-cover" />
                            {person.status === 'online' && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">{person.username}</p>
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{person.email || 'Mobile contact'}</p>
                          </div>
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/50">
                            {connected ? 'Chat' : 'Invite'}
                          </span>
                        </button>
                      );
                    }) : (
                      <div className="grid h-60 place-items-center rounded-3xl border border-dashed border-slate-200 text-center text-slate-500 dark:border-slate-700">
                        <div>
                          <FiUser className="mx-auto mb-3" size={28} />
                          <p>No contacts found</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeSection === 'calls' ? (
              <div className="space-y-3">
                {callsLoading ? (
                  [1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />)
                ) : callHistory.length ? (
                  callHistory.map((call) => {
                    const other = call.caller?._id === user?._id ? call.receiver : call.caller;
                    const outgoing = call.caller?._id === user?._id;
                    return (
                      <div key={call._id} className="flex items-center gap-3 rounded-3xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <img src={getAvatar(other)} alt={other?.username} className="h-12 w-12 rounded-full object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{other?.username || 'Unknown user'}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {outgoing ? 'Outgoing' : 'Incoming'} {call.callType} · {call.status} · {formatDay(call.createdAt)}
                          </p>
                        </div>
                        {call.callType === 'video' ? <FiVideo className="text-indigo-500" /> : <FiPhone className="text-emerald-500" />}
                      </div>
                    );
                  })
                ) : (
                  <div className="grid h-60 place-items-center rounded-3xl border border-dashed border-slate-200 text-center text-slate-500 dark:border-slate-700">
                    <div>
                      <FiPhone className="mx-auto mb-3" size={28} />
                      <p>No call history yet</p>
                    </div>
                  </div>
                )}
              </div>
            ) : activeSection === 'saved' || activeSection === 'archived' ? (
              <div className="grid h-60 place-items-center rounded-3xl border border-dashed border-slate-200 text-center text-slate-500 dark:border-slate-700">
                <div>
                  <FiMessageCircle className="mx-auto mb-3" size={28} />
                  <p>{pageTitle} will appear here when available</p>
                </div>
              </div>
            ) : chatLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : filteredChats.length ? (
              filteredChats.map((chat) => {
                const other = chat.isGroupChat ? null : getOtherUser(user, chat.users);
                const name = chat.isGroupChat ? chat.chatName : other?.username;
                const unread = chat.unreadCount?.find((item) => item.user === user?._id)?.count || 0;
                const online = other && (onlineUsers.includes(other._id) || other.status === 'online');

                return (
                  <button
                    key={chat._id}
                    onClick={() => setSelectedChat(chat)}
                    className={`animated-button mb-2 flex w-full items-center gap-3 rounded-3xl p-3 text-left transition ${
                      selectedChat?._id === chat._id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="relative">
                      <img src={getAvatar(chat.isGroupChat ? { username: chat.chatName, avatar: chat.groupAvatar } : other)} alt={name} className="h-12 w-12 rounded-full object-cover" />
                      {online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-bold">{name}</p>
                        <span className={`text-xs ${selectedChat?._id === chat._id ? 'text-white/75' : 'text-slate-400'}`}>{formatDay(chat.latestMessage?.createdAt || chat.updatedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${selectedChat?._id === chat._id ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {typingChatId === chat._id ? 'Typing...' : chat.latestMessage?.content || 'Start a conversation'}
                        </p>
                        {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">{unread}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="grid h-60 place-items-center rounded-3xl border border-dashed border-slate-200 text-center text-slate-500 dark:border-slate-700">
                <div>
                  <FiSearch className="mx-auto mb-3" size={28} />
                  <p>No chats found</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <main className={`${selectedChat ? 'flex' : 'hidden md:flex'} min-w-0 flex-col bg-[#efeae2] bg-chat-pattern dark:bg-slate-950`}>
          {selectedChat ? (
            <>
              <header className="flex h-20 items-center justify-between border-b border-black/5 bg-white/90 px-5 backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
                <div className="flex min-w-0 items-center gap-2">
                  <button onClick={() => setSelectedChat(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden" title="Back to chats">
                    <FiArrowLeft />
                  </button>
                  <button onClick={() => setDetailsOpen((value) => !value)} className="flex min-w-0 items-center gap-3 text-left">
                    <img src={getAvatar(selectedChat.isGroupChat ? { username: selectedChat.chatName, avatar: selectedChat.groupAvatar } : currentChatUser)} alt={selectedName} className="h-12 w-12 rounded-full object-cover" />
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold sm:text-lg">{selectedName}</h2>
                      <p className="truncate text-xs text-emerald-500 sm:text-sm">
                        {typingChatId === selectedChat._id ? 'typing...' : currentChatUser?.status === 'online' ? 'Online' : currentChatUser?.lastSeen ? `Last seen ${formatDay(currentChatUser.lastSeen)}` : 'Tap for profile'}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                  <button onClick={() => beginCall('audio')} className="animated-button grid h-10 w-10 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800" title="Audio call"><FiPhone /></button>
                  <button onClick={() => beginCall('video')} className="animated-button grid h-10 w-10 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800" title="Video call"><FiVideo /></button>
                  <button onClick={() => setChatSearchOpen((value) => !value)} className="animated-button grid h-10 w-10 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800" title="Search this chat"><FiSearch /></button>
                  <button onClick={() => setDetailsOpen((value) => !value)} className="animated-button grid h-10 w-10 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800" title="Chat details"><FiMoreHorizontal /></button>
                </div>
              </header>
              {chatSearchOpen && (
                <div className="border-b border-black/5 bg-white/85 px-5 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/85">
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
                    <FiSearch className="text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      placeholder="Search messages, people, or chats"
                    />
                    <button onClick={() => { setSearch(''); setChatSearchOpen(false); }} className="text-slate-400 hover:text-slate-700 dark:hover:text-white"><FiX /></button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((item) => <div key={item} className="h-14 max-w-md animate-pulse rounded-3xl bg-white/70 dark:bg-slate-800" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hasMoreMessages && (
                      <div className="flex justify-center">
                        <button
                          onClick={loadOlderMessages}
                          disabled={olderMessagesLoading}
                          className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-indigo-600 shadow-sm disabled:opacity-60 dark:bg-slate-800"
                        >
                          {olderMessagesLoading ? 'Loading...' : 'Load earlier messages'}
                        </button>
                      </div>
                    )}
                    <div className="mx-auto w-fit rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">Today</div>
                    {visibleMessages.map((message) => {
                      const own = message.sender?._id === user?._id;
                      const starred = message.isStarred?.some((id) => id === user?._id);
                      return (
                        <div key={message._id} className={`group flex ${own ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-3xl px-4 py-2 shadow-sm transition md:max-w-[62%] ${
                            own
                              ? 'rounded-br-md bg-[#dcf8c6] text-slate-900'
                              : 'rounded-bl-md bg-white text-slate-900 dark:bg-slate-800 dark:text-white'
                          }`}>
                            {message.replyTo && (
                              <div className="mb-2 rounded-2xl border-l-4 border-indigo-500 bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
                                {message.replyTo.content || 'Attachment'}
                              </div>
                            )}
                              {message.isPinned && <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-indigo-500"><FiBookmark /> Pinned</div>}
                            {message.fileUrl && message.type === 'image' && <img src={message.fileUrl} alt={message.fileName || 'Shared image'} className="mb-2 max-h-72 rounded-2xl object-cover" />}
                            {message.fileUrl && message.type === 'video' && <video src={message.fileUrl} controls className="mb-2 max-h-72 rounded-2xl" />}
                            {message.fileUrl && message.type === 'audio' && <audio src={message.fileUrl} controls className="mb-2 w-full" />}
                            {message.fileUrl && message.type === 'document' && (
                              <a href={message.fileUrl} target="_blank" rel="noreferrer" download={message.fileName} className="mb-2 flex items-center gap-2 rounded-2xl bg-black/5 p-3 text-sm font-semibold dark:bg-white/10">
                                <FiFile /> {message.fileName || 'Document'}
                              </a>
                            )}
                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                            {message.reactions?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {message.reactions.map((reaction, index) => <span key={`${reaction.emoji}-${index}`} className="rounded-full bg-white/70 px-2 py-0.5 text-xs shadow-sm dark:bg-slate-700">{reaction.emoji}</span>)}
                              </div>
                            )}
                            <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                              {starred && <FiStar className="text-amber-500" />}
                              {formatTime(message.createdAt)}
                              {own && <FiCheckCircle className="text-sky-500" />}
                            </div>
                            <div className="mt-2 hidden flex-wrap items-center gap-1 group-hover:flex">
                              {reactions.map((emoji) => <button key={emoji} onClick={() => reactToMessage(message, emoji)} className="rounded-full bg-black/5 px-2 py-1 text-xs dark:bg-white/10">{emoji}</button>)}
                              <button onClick={() => setReplyTo(message)} className="message-action" title="Reply"><FiMessageCircle /></button>
                              <button onClick={() => forwardMessage(message)} className="message-action" title="Forward"><FiShare2 /></button>
                              <button onClick={() => { setEditing(message); setMessageDraft(message.content); }} className="message-action"><FiEdit3 /></button>
                              <button onClick={() => toggleStar(message)} className="message-action"><FiStar /></button>
                              <button onClick={() => togglePin(message)} className="message-action"><FiBookmark /></button>
                              <button onClick={() => deleteMessage(message, false)} className="message-action"><FiX /></button>
                              {own && <button onClick={() => deleteMessage(message, true)} className="message-action text-red-500"><FiTrash2 /></button>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <footer className="border-t border-black/5 bg-white/90 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
                {(replyTo || editing || attachment) && (
                  <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
                    <div className="min-w-0">
                      <p className="font-semibold text-indigo-500">{editing ? 'Editing message' : replyTo ? 'Replying to message' : 'Attachment ready'}</p>
                      <p className="truncate text-slate-500">{editing?.content || replyTo?.content || attachment?.name}</p>
                      {attachmentPreview && attachment?.type.startsWith('image/') && (
                        <img src={attachmentPreview} alt="Attachment preview" className="mt-3 max-h-36 rounded-2xl object-cover" />
                      )}
                      {attachmentPreview && attachment?.type.startsWith('video/') && (
                        <video src={attachmentPreview} controls className="mt-3 max-h-36 rounded-2xl" />
                      )}
                      {attachment && uploadProgress > 0 && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setReplyTo(null); setEditing(null); setAttachment(null); }}><FiX /></button>
                  </div>
                )}

                {showEmojiPicker && (
                  <div className="mb-3 max-w-full overflow-hidden rounded-2xl border border-black/5 shadow-xl dark:border-white/10">
                    <Suspense fallback={<div className="grid h-40 place-items-center bg-white text-sm text-slate-500 dark:bg-slate-900">Loading emojis...</div>}>
                      <EmojiPicker
                        width="100%"
                        height={360}
                        theme={isDark ? 'dark' : 'light'}
                        lazyLoadEmojis
                        searchDisabled={false}
                        skinTonesDisabled={false}
                        onEmojiClick={(emojiData) => setMessageDraft((value) => `${value}${emojiData.emoji}`)}
                      />
                    </Suspense>
                  </div>
                )}

                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} className="composer-button"><FiSmile /></button>
                  <button type="button" onClick={() => pickFile()} className="composer-button"><FiPaperclip /></button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                    accept={fileAccept}
                    capture={fileCapture || undefined}
                  />
                  <input
                    value={messageDraft}
                    onChange={(event) => handleTyping(event.target.value)}
                    className="min-w-0 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-800"
                    placeholder="Type a message..."
                  />
                  <button type="button" onClick={recording ? stopVoiceNote : startVoiceNote} className={`composer-button ${recording ? 'text-red-500' : ''}`}><FiMic /></button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="animated-button grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FiSend />}
                  </button>
                </form>

                <div className="mt-3 grid grid-cols-4 gap-2 text-xs sm:grid-cols-7">
                  {[
                    [FiImage, 'Photo'],
                    [FiVideo, 'Video'],
                    [FiFile, 'Document'],
                    [FiMic, 'Audio'],
                    [FiCamera, 'Camera'],
                    [FiUser, 'Contact'],
                    [FiHeart, 'GIF'],
                  ].map(([Icon, label]) => (
                    <button key={label} type="button" onClick={() => handleQuickAction(label)} className="animated-button rounded-2xl bg-slate-100 p-3 font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="mx-auto mb-1" /> {label}
                    </button>
                  ))}
                </div>
              </footer>
            </>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30">
                  <FiSend size={32} />
                </div>
                <h2 className="text-3xl font-bold">Your messages</h2>
                <p className="mt-2 text-slate-500">Search a username or choose a chat to start messaging.</p>
              </div>
            </div>
          )}
        </main>

        <aside className={`${detailsOpen ? 'hidden lg:flex' : 'hidden'} flex-col border-l border-black/5 bg-white dark:border-white/10 dark:bg-slate-900`}>
          {selectedChat && (
            <>
              <div className="p-5">
                <div className="rounded-[2rem] bg-slate-50 p-6 text-center dark:bg-slate-800/70">
                  <div className="relative mx-auto h-28 w-28">
                    <img src={getAvatar(selectedChat.isGroupChat ? { username: selectedChat.chatName, avatar: selectedChat.groupAvatar } : currentChatUser)} alt={selectedName} className="h-28 w-28 rounded-full object-cover" />
                    {currentChatUser?.status === 'online' && <span className="absolute bottom-2 right-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 dark:border-slate-800" />}
                  </div>
                  <h2 className="mt-4 text-xl font-black">{selectedName}</h2>
                  <p className="text-sm text-emerald-500">{currentChatUser?.status === 'online' ? 'Online' : 'Offline'}</p>
                  {profilePath && (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-500 dark:bg-slate-900">
                      <Link to={profilePath} className="truncate font-semibold text-indigo-500">{profilePath}</Link>
                      <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${profilePath}`)}><FiCopy /></button>
                    </div>
                  )}
                  <div className="mt-5 grid grid-cols-4 gap-2 text-xs text-slate-500">
                    <button onClick={() => beginCall('audio')} className="profile-action"><FiPhone />Audio</button>
                    <button onClick={() => beginCall('video')} className="profile-action"><FiVideo />Video</button>
                    <button onClick={() => setChatSearchOpen(true)} className="profile-action"><FiSearch />Search</button>
                    <button onClick={() => setDetailsOpen(false)} className="profile-action"><FiMoreHorizontal />More</button>
                  </div>
                  {currentChatUser && (
                    <button
                      onClick={selectedProfile?.isConnected ? removeConnection : requestConnection}
                      disabled={selectedProfile?.hasRequested && !selectedProfile?.isConnected}
                      className="animated-button mt-4 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20"
                    >
                      {selectedProfile?.isConnected ? 'Remove contact' : selectedProfile?.hasRequested ? 'Request sent' : 'Add contact'}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3 border-t border-black/5 p-5 text-sm dark:border-white/10">
                <section>
                  <h3 className="font-bold">About</h3>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">{currentChatUser?.bio || selectedChat.groupDescription || 'No bio yet.'}</p>
                </section>
                <button onClick={() => switchSection('favorites')} className="settings-row"><FiBookmark /> Starred Messages <span>{messages.filter((message) => message.isStarred?.includes(user?._id)).length}</span></button>
                <button onClick={archiveSelectedChat} className="settings-row"><FiArchive /> Archive Chat <span><FiCheck /></span></button>
                <button onClick={blockCurrentUser} className="settings-row text-red-500"><FiTrash2 /> Block User</button>
              </div>
            </>
          )}
        </aside>
      </div>

      {showProfileSettings && <ProfileSettingsModal onClose={() => setShowProfileSettings(false)} />}

      {callState && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white p-4 text-center shadow-2xl dark:bg-slate-900">
            <audio ref={remoteAudioRef} autoPlay playsInline />
            {callState.callType === 'video' ? (
              <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-slate-950">
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 h-28 w-40 rounded-2xl border-2 border-white/80 bg-slate-900 object-cover shadow-xl" />
                {cameraMuted && <div className="absolute inset-0 grid place-items-center text-sm font-bold text-white/70">Camera off</div>}
              </div>
            ) : (
              <div className="py-6">
                <div className="call-ripple mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full bg-indigo-600 text-white">
                  <FiPhone size={34} />
                </div>
              </div>
            )}
            <h2 className="mt-4 text-2xl font-black">
              {callState.direction === 'incoming' && callState.status === 'ringing' ? 'Incoming call' : callState.status === 'connected' ? 'Connected' : 'Calling...'}
            </h2>
            <p className="mt-1 text-slate-500">{callState.from?.username || currentChatUser?.username || selectedName}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">
              {callQuality === 'good' ? 'Good connection' : callQuality}
            </p>
            {callStartedAt && <p className="mt-2 text-sm font-semibold text-emerald-500">Connected {callElapsed}s</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {callState.direction === 'incoming' && callState.status === 'ringing' && (
                <button onClick={acceptCall} className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white" title="Accept call"><FiPhone /></button>
              )}
              <button onClick={toggleMicrophone} className={`grid h-12 w-12 place-items-center rounded-full ${micMuted ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`} title="Mute microphone"><FiMic /></button>
              {callState.callType === 'video' && (
                <>
                  <button onClick={toggleCamera} className={`grid h-12 w-12 place-items-center rounded-full ${cameraMuted ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`} title="Disable camera"><FiVideo /></button>
                  <button onClick={switchCamera} className="rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200" title="Switch camera">Switch</button>
                  <button onClick={toggleScreenShare} className={`rounded-full px-4 text-xs font-bold ${screenSharing ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`} title="Screen share">Screen</button>
                  <button onClick={openCallFullscreen} className="rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200" title="Full screen">Full</button>
                </>
              )}
              <button onClick={toggleSpeaker} className={`rounded-full px-4 text-xs font-bold ${speakerMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`} title="Speaker mode">Speaker</button>
              <button onClick={endCall} className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white" title="End call"><FiX /></button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl dark:bg-white dark:text-slate-950">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ChatPage;
