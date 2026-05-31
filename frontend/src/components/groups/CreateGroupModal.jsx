import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiX, FiSearch, FiCheck } from 'react-icons/fi';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';
import { searchUsers, createGroupChat } from '../../store/chatSlice';

const CreateGroupModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { theme } = useSelector((s) => s.auth);
  const { searchResults } = useSelector((s) => s.chat);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e) => {
    setQuery(e.target.value);
    if (e.target.value.trim()) dispatch(searchUsers(e.target.value));
  };

  const toggleUser = (user) => {
    setSelected(prev =>
      prev.find(u => u._id === user._id)
        ? prev.filter(u => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length < 2) return;
    setLoading(true);
    try {
      await dispatch(createGroupChat({
        name,
        description,
        users: JSON.stringify(selected.map(u => u._id)),
      }));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const bg = theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900';
  const inputCls = `w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 transition ${theme === 'dark' ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 text-gray-900 placeholder-gray-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`${bg} w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Create Group Chat</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name *" className={inputCls} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className={inputCls} />
        </div>

        {/* Selected Users */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selected.map(u => (
              <span key={u._id} className="flex items-center gap-1 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-200 text-xs px-2 py-1 rounded-full">
                {u.username}
                <button onClick={() => toggleUser(u)}><FiX size={12} /></button>
              </span>
            ))}
          </div>
        )}

        {/* User Search */}
        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input value={query} onChange={handleSearch} placeholder="Add members..." className={`${inputCls} pl-8`} />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1 mb-5">
          {searchResults.map(u => {
            const isSelected = !!selected.find(s => s._id === u._id);
            return (
              <button key={u._id} onClick={() => toggleUser(u)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${isSelected ? 'bg-violet-50 dark:bg-violet-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <Avatar user={u} size="sm" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{u.username}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                {isSelected && <FiCheck className="text-violet-500" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || selected.length < 2 || loading}
          className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? <Spinner size="sm" color="white" /> : 'Create Group'}
        </button>
        {selected.length < 2 && name && (
          <p className="text-xs text-center text-gray-400 mt-2">Add at least 2 members</p>
        )}
      </div>
    </div>
  );
};

export default CreateGroupModal;
