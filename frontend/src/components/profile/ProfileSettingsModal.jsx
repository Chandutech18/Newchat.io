import { useEffect, useState } from 'react';
import { FiBell, FiCamera, FiCopy, FiEye, FiLock, FiToggleLeft, FiToggleRight, FiX } from 'react-icons/fi';
import API from '../../utils/api';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, uploadAvatar } from '../../store/authSlice';

const ProfileSettingsModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await API.get('/user/me/profile');
        setProfile(data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load profile settings');
      }
    };

    loadProfile();
  }, []);

  const updateSetting = (section, key, value) => {
    setError('');
    setProfile((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  };

  const updateProfileField = (key, value) => {
    setError('');
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const avatar = await dispatch(uploadAvatar(formData)).unwrap();
      setProfile((current) => ({ ...current, avatar }));
    } catch (err) {
      setError(err || 'Could not upload avatar');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    try {
      await dispatch(updateProfile({
        username: profile.username,
        bio: profile.bio,
        avatar: profile.avatar,
      })).unwrap();
      const { data } = await API.put('/user/me/settings', {
        privacy: profile.privacy,
        notifications: profile.notifications,
      });
      setProfile(data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const profileUrl = `${window.location.origin}/u/${user?.username}`;

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur">
        <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white">
          {error ? (
            <>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-black">Profile Settings</h2>
                <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <FiX />
                </button>
              </div>
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            </>
          ) : (
            <div className="h-80 animate-pulse rounded-[2rem] bg-slate-100 dark:bg-slate-800" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">Profile Settings</p>
            <h2 className="text-2xl font-black">Your Chat.io identity</h2>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
            <FiX />
          </button>
        </div>

        <section className="rounded-[1.5rem] bg-slate-50 p-5 dark:bg-slate-800/70">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <img
                src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=6366f1&color=fff&size=160&bold=true`}
                alt={profile.username}
                className="h-24 w-24 rounded-full object-cover"
              />
              <button className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white">
                <FiCamera />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  title="Upload avatar"
                />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={profile.username || ''}
                onChange={(event) => updateProfileField('username', event.target.value)}
                className="w-full rounded-2xl bg-white px-3 py-2 text-xl font-black outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-900"
              />
              <textarea
                value={profile.bio || ''}
                onChange={(event) => updateProfileField('bio', event.target.value)}
                rows={2}
                maxLength={200}
                className="mt-2 w-full resize-none rounded-2xl bg-white px-3 py-2 text-sm text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-900 dark:text-slate-300"
              />
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 dark:bg-slate-900">
                  <span className="font-semibold text-slate-500">User ID</span>
                  <span className="min-w-0 flex-1 truncate">{profile._id}</span>
                  <button onClick={() => navigator.clipboard?.writeText(profile._id)}><FiCopy /></button>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 dark:bg-slate-900">
                  <span className="font-semibold text-slate-500">URL</span>
                  <span className="min-w-0 flex-1 truncate">{profileUrl}</span>
                  <button onClick={() => navigator.clipboard?.writeText(profileUrl)}><FiCopy /></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-200 p-5 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2 font-black"><FiLock /> Privacy</div>
            <label className="mb-3 block text-sm font-semibold text-slate-500">Profile visibility</label>
            <select
              value={profile.privacy?.profileVisibility || 'public'}
              onChange={(event) => updateSetting('privacy', 'profileVisibility', event.target.value)}
              className="mb-4 w-full rounded-2xl bg-slate-100 px-4 py-3 outline-none dark:bg-slate-800"
            >
              <option value="public">Public</option>
              <option value="connections">Connections only</option>
            </select>
            <ToggleRow icon={FiEye} label="Show last seen" active={profile.privacy?.showLastSeen !== false} onClick={() => updateSetting('privacy', 'showLastSeen', profile.privacy?.showLastSeen === false)} />
            <ToggleRow icon={FiEye} label="Show online status" active={profile.privacy?.showOnlineStatus !== false} onClick={() => updateSetting('privacy', 'showOnlineStatus', profile.privacy?.showOnlineStatus === false)} />
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 p-5 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2 font-black"><FiBell /> Notifications</div>
            <ToggleRow label="Messages" active={profile.notifications?.messages !== false} onClick={() => updateSetting('notifications', 'messages', profile.notifications?.messages === false)} />
            <ToggleRow label="Calls" active={profile.notifications?.calls !== false} onClick={() => updateSetting('notifications', 'calls', profile.notifications?.calls === false)} />
            <ToggleRow label="Connection requests" active={profile.notifications?.connectionRequests !== false} onClick={() => updateSetting('notifications', 'connectionRequests', profile.notifications?.connectionRequests === false)} />
          </div>
        </section>

        {error && (
          <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">Cancel</button>
          <button onClick={saveSettings} disabled={saving} className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToggleRow = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
    {Icon && <Icon className="text-slate-400" />}
    <span className="flex-1 font-semibold">{label}</span>
    {active ? <FiToggleRight className="text-2xl text-indigo-500" /> : <FiToggleLeft className="text-2xl text-slate-400" />}
  </button>
);

export default ProfileSettingsModal;
