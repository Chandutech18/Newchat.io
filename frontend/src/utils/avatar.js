// Default avatar based on username initials
export const getAvatarUrl = (user) => {
  if (user?.avatar) return user.avatar;
  const name = encodeURIComponent(user?.username || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&size=128&bold=true`;
};
