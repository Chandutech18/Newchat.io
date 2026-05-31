import { getAvatarUrl } from '../../utils/avatar';

const Avatar = ({ user, size = 'md', online = false, className = '' }) => {
  const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <img
        src={getAvatarUrl(user)}
        alt={user?.username || 'User'}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'U')}&background=6366f1&color=fff`;
        }}
      />
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-gray-800" />
      )}
    </div>
  );
};

export default Avatar;
