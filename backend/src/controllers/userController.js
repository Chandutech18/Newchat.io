import User from '../models/User.js';

const profilePayload = (user, viewerId = null) => {
  const connections = user.connections || [];
  const requests = user.connectionRequests || [];
  const isConnected = viewerId ? connections.some((id) => id.toString() === viewerId.toString()) : false;
  const hasRequested = viewerId ? requests.some((id) => id.toString() === viewerId.toString()) : false;

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    status: user.status,
    lastSeen: user.privacy?.showLastSeen === false && !isConnected ? null : user.lastSeen,
    privacy: user.privacy,
    notifications: user.notifications,
    connectionsCount: connections.length,
    requestsCount: requests.length,
    connections,
    connectionRequests: requests,
    isConnected,
    hasRequested,
    joinedAt: user.createdAt,
    profilePath: `/u/${user.username}`,
    profileUrl: `/u/${user.username}`,
  };
};

// @desc Search users
export const searchUsers = async (req, res) => {
  const keyword = req.query.search
    ? { $or: [{ username: { $regex: req.query.search, $options: 'i' } }, { email: { $regex: req.query.search, $options: 'i' } }] }
    : {};
  try {
    const users = await User.find(keyword)
      .find({ _id: { $ne: req.user._id } })
      .select('-password')
      .limit(10);
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Get current user's profile settings and connections
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('connections', 'username email avatar bio status lastSeen')
      .populate('connectionRequests', 'username email avatar bio status lastSeen');
    res.json(profilePayload(user, req.user._id));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Update privacy and notification settings
export const updateProfileSettings = async (req, res) => {
  try {
    const updates = {};
    if (req.body.privacy) updates.privacy = req.body.privacy;
    if (req.body.notifications) updates.notifications = req.body.notifications;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json(profilePayload(user, req.user._id));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Get all users (admin)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Ban/unban user (admin)
export const banUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: req.body.isBanned }, { new: true });
    res.json({ message: req.body.isBanned ? 'User banned' : 'User unbanned', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Get public profile by username
export const getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      'username email avatar bio status lastSeen createdAt connections connectionRequests privacy notifications'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(profilePayload(user, req.user?._id));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Send a connection request
export const requestConnection = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Cannot connect with yourself' });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    if (target.connections.some((id) => id.toString() === req.user._id.toString())) {
      return res.json({ message: 'Already connected', status: 'connected' });
    }

    if (!target.connectionRequests.some((id) => id.toString() === req.user._id.toString())) {
      target.connectionRequests.push(req.user._id);
      await target.save();
    }

    res.json({ message: 'Connection request sent', status: 'requested' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Accept a connection request
export const acceptConnection = async (req, res) => {
  try {
    const requester = await User.findById(req.params.id);
    const current = await User.findById(req.user._id);
    if (!requester || !current) return res.status(404).json({ message: 'User not found' });

    current.connectionRequests = current.connectionRequests.filter((id) => id.toString() !== requester._id.toString());
    if (!current.connections.some((id) => id.toString() === requester._id.toString())) current.connections.push(requester._id);
    if (!requester.connections.some((id) => id.toString() === current._id.toString())) requester.connections.push(current._id);

    await current.save();
    await requester.save();

    res.json({ message: 'Connection accepted', status: 'connected' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Remove a connection or request
export const removeConnection = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { connections: req.params.id, connectionRequests: req.params.id },
    });
    await User.findByIdAndUpdate(req.params.id, {
      $pull: { connections: req.user._id, connectionRequests: req.user._id },
    });

    res.json({ message: 'Connection removed', status: 'removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Block or unblock a user
export const toggleBlockUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const current = await User.findById(req.user._id);
    const target = await User.findById(req.params.id);
    if (!current || !target) return res.status(404).json({ message: 'User not found' });

    const blocked = current.blockedUsers.some((id) => id.toString() === target._id.toString());
    if (blocked) current.blockedUsers = current.blockedUsers.filter((id) => id.toString() !== target._id.toString());
    else {
      current.blockedUsers.push(target._id);
      current.connections = current.connections.filter((id) => id.toString() !== target._id.toString());
      current.connectionRequests = current.connectionRequests.filter((id) => id.toString() !== target._id.toString());
      target.connections = target.connections.filter((id) => id.toString() !== current._id.toString());
      target.connectionRequests = target.connectionRequests.filter((id) => id.toString() !== current._id.toString());
      await target.save();
    }

    await current.save();
    res.json({ blocked: !blocked, userId: target._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
