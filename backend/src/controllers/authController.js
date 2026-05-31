import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import crypto from 'crypto';
import path from 'path';

// @desc Register
export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (await User.findOne({ $or: [{ email }, { username }] }))
      return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ username, email, password });
    generateToken(res, user._id);
    res.status(201).json({ _id: user._id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, status: user.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    if (user.isBanned)
      return res.status(403).json({ message: 'Account has been banned' });
    await User.findByIdAndUpdate(user._id, { status: 'online' });
    generateToken(res, user._id);
    res.json({ _id: user._id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, status: 'online', isAdmin: user.isAdmin });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Logout
export const logoutUser = async (req, res) => {
  try {
    if (req.user) await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });
  } catch (_) {}
  res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc Get profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Update profile
export const updateUserProfile = async (req, res) => {
  try {
    const { username, bio, avatar } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ _id: user._id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, status: user.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Upload avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { uploadToCloudinary } = await import('../config/cloudinary.js');
    const result = await uploadToCloudinary(req.file.path, 'chat-io/avatars');
    const avatar = result?.secure_url || `${req.protocol}://${req.get('host')}/uploads/${path.basename(req.file.path)}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true }).select('-password');
    res.json({ avatar: user.avatar });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();
    // In production, send email with token
    res.json({ message: 'Password reset token generated', token: token }); // dev only
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Reset password
export const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    generateToken(res, user._id);
    res.json({ message: 'Password reset successful' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Block user
export const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.blockedUsers.includes(req.params.userId))
      return res.status(400).json({ message: 'User already blocked' });
    user.blockedUsers.push(req.params.userId);
    await user.save();
    res.json({ message: 'User blocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Unblock user
export const unblockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.userId } });
    res.json({ message: 'User unblocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
