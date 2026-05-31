import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiEdit, FiMessageSquare, FiUsers, FiSettings,
  FiMoon, FiSun, FiX,
} from 'react-icons/fi';
import Avatar from '../common/Avatar';
import { fetchChats, setSelectedChat, searchUsers, accessChat, clearSearchResults, clearNotification } from '../../store/chatSlice';
import { toggleTheme } from '../../store/authSlice';
import { getSender, getSenderName, formatChatDate, isUserOnline } from '../../utils/helpers';
import CreateGroupModal from '../groups/CreateGroupModal';

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const searchRef = useRef(null);

  const { user, theme } = useSelector((s) => s.auth);
  const { chats, selectedChat, searchResults, onlineUsers, notification } = useSelector((s) => s.chat);

  useEffect(() => { dispatch(fetchChats()); }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim()) dispatch(searchUsers(search));
      else dispatch(clearSearchResults());
    }, 400);
    return () => clearTimeout(t);
  }, [search, dispatch]);

  const handleSelectChat = (chat) => {
    dispatch(setSelectedChat(chat));
    dispatch(clearNotification(chat._id));
  };

  const handleSelectUser = (selectedUser) => {
    dispatch(accessChat(selectedUser._id));
    setSearch('');
    dispatch(clearSearchResults());
    setShowSearch(false);
  };

  const getChatName = (chat) =>
    chat.isGroupChat ? chat.chatName : getSenderName(user, chat.users);

  const getChatUser = (chat) =>
    chat.isGroupChat ? null : getSender(user, chat.users);

  const isChatOnline = (chat) => {
    if (chat.isGroupChat) return false;
    const other = getChatUser(chat);
    return other ? isUserOnline(other._id, onlineUsers) : false;
  };

  const getUnread = (chatId) => notification.filter(n => n.chat._id === chatId).length;

  const filteredChats = chats.filter(c => {
    const name = getChatName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className={`flex flex-col h-full w-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>

      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 hover:opacity-80 transition">
          <Avatar user={user} size="sm" online={true} />
          <span className="font-semibold text-sm hidden md:block truncate max-w-[100px]">{user?.username}</span>
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => dispatch(toggleTheme())} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition`}>
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <button onClick={() => setShowCreateGroup(true)} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition`} title="New Group">
            <FiUsers size={18} />
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition`} title="New Chat">
            <FiEdit size={18} />
          </button>
          <button onClick={() => navigate('/settings')} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition`}>
            <FiSettings size={18} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="relative">
          <FiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats or start new..."
            className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 transition ${
              theme === 'dark' ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 text-gray-900 placeholder-gray-500'
            }`}
          />
          {search && (
            <button onClick={() => { setSearch(''); dispatch(clearSearchResults()); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`px-4 py-1 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>People</p>
          {searchResults.map(u => (
            <button
              key={u._id}
              onClick={() => handleSelectUser(u)}
              className={`w-full flex items-center gap-3 px-4 py-2 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} transition`}
            >
              <Avatar user={u} size="sm" online={isUserOnline(u._id, onlineUsers)} />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium truncate">{u.username}</p>
                <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 && !search && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <FiMessageSquare size={32} className="text-gray-300" />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No conversations yet</p>
          </div>
        )}
        {filteredChats.map((chat) => {
          const isSelected = selectedChat?._id === chat._id;
          const chatUser = getChatUser(chat);
          const online = isChatOnline(chat);
          const unread = getUnread(chat._id);
          const lastMsg = chat.latestMessage;

          return (
            <button
              key={chat._id}
              onClick={() => handleSelectChat(chat)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b transition ${
                theme === 'dark'
                  ? `border-gray-700 ${isSelected ? 'bg-gray-700' : 'hover:bg-gray-750'}`
                  : `border-gray-100 ${isSelected ? 'bg-violet-50 border-l-4 border-l-violet-500' : 'hover:bg-gray-50'}`
              }`}
            >
              <Avatar user={chat.isGroupChat ? { username: chat.chatName, avatar: chat.groupAvatar } : chatUser} size="md" online={online} />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline">
                  <span className={`text-sm font-semibold truncate ${isSelected && !theme === 'dark' ? 'text-violet-700' : ''}`}>
                    {getChatName(chat)}
                  </span>
                  {lastMsg && (
                    <span className={`text-[11px] flex-shrink-0 ml-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
                      {formatChatDate(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lastMsg?.deletedForEveryone ? '🚫 This message was deleted' : (lastMsg?.content || (lastMsg?.fileUrl ? '📎 Attachment' : 'Start chatting'))}
                  </p>
                  {unread > 0 && (
                    <span className="flex-shrink-0 ml-1 bg-violet-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </div>
  );
};

export default Sidebar;
