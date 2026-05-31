import { format, isToday, isYesterday, parseISO } from 'date-fns';

export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(date, 'hh:mm a');
};

export const formatChatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return formatTime(date);
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yyyy');
};

export const formatMessageDate = (dateStr) => {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM dd, yyyy');
};

export const formatCallDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getSender = (loggedUser, users = []) => {
  if (!users || users.length < 2) return null;
  return users[0]._id === loggedUser._id ? users[1] : users[0];
};

export const getSenderName = (loggedUser, users = []) => {
  const sender = getSender(loggedUser, users);
  return sender?.username || 'Unknown';
};

export const isUserOnline = (userId, onlineUsers) => onlineUsers.includes(userId);
