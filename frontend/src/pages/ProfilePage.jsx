import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCopy, FiMessageCircle, FiUserPlus } from 'react-icons/fi';
import API from '../utils/api';

const getAvatar = (user) => {
  if (user?.avatar) return user.avatar;
  const name = encodeURIComponent(user?.username || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&size=256&bold=true`;
};

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/user/profile/${username}`);
        setProfile(data);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  const copyProfile = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/u/${username}`);
    setMessage('Profile link copied');
  };

  const requestConnection = async () => {
    if (!profile?._id) return;
    try {
      await API.post(`/user/${profile._id}/connect`);
      setProfile((current) => ({ ...current, hasRequested: true }));
      setMessage('Connection request sent');
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Could not send connection request');
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f5ef] dark:bg-slate-950">
        <div className="h-48 w-full max-w-sm animate-pulse rounded-[2rem] bg-white shadow-xl dark:bg-slate-900" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f5ef] text-center dark:bg-slate-950 dark:text-white">
        <div>
          <h1 className="text-2xl font-black">Profile not found</h1>
          <Link to="/" className="mt-4 inline-block text-indigo-500">Go back to chats</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] p-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-900">
        <div className="relative h-44 bg-gradient-to-br from-[#25d366] via-[#5b5ff6] to-[#c13584]">
          <button onClick={() => navigate(-1)} className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur">
            <FiArrowLeft />
          </button>
        </div>
        <div className="-mt-16 px-6 pb-8 text-center">
          <img src={getAvatar(profile)} alt={profile.username} className="mx-auto h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl dark:border-slate-900" />
          <h1 className="mt-4 text-3xl font-black">{profile.username}</h1>
          <p className="text-emerald-500">{profile.status === 'online' ? 'Online' : 'Offline'}</p>
          <p className="mx-auto mt-4 max-w-md text-slate-500 dark:text-slate-400">{profile.bio || 'No bio yet.'}</p>

          <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
            <span className="truncate font-semibold text-indigo-500">/u/{profile.username}</span>
            <button onClick={copyProfile}><FiCopy /></button>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Link to="/" className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-500/25">
              <FiMessageCircle /> Message
            </Link>
            <button
              onClick={requestConnection}
              disabled={profile.hasRequested || profile.isConnected}
              className="flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200"
            >
              <FiUserPlus /> {profile.isConnected ? 'Connected' : profile.hasRequested ? 'Requested' : 'Connect'}
            </button>
          </div>
          {message && <p className="mt-4 text-sm font-semibold text-indigo-500">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
