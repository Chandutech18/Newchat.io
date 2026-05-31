import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const notifications = await Notification.find({ user: req.user._id })
      .populate('actor', 'username avatar status')
      .populate('chat', 'chatName isGroupChat groupAvatar')
      .populate('message', 'content type fileName createdAt')
      .populate('call', 'callType status duration createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'Notifications marked read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
