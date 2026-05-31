import Chat from '../models/Chat.js';
import User from '../models/User.js';
import crypto from 'crypto';

const populateChat = (query) =>
  query
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate({ path: 'latestMessage', populate: { path: 'sender', select: 'username avatar' } });

// @desc Access or create 1-on-1 chat
export const accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'UserId required' });

  try {
    let chat = await populateChat(
      Chat.findOne({
        isGroupChat: false,
        users: { $all: [req.user._id, userId] },
      })
    );

    if (chat) return res.json(chat);

    const newChat = await Chat.create({ isGroupChat: false, chatName: 'sender', users: [req.user._id, userId] });
    chat = await populateChat(Chat.findById(newChat._id));
    res.status(201).json(chat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Fetch all chats for a user
export const fetchChats = async (req, res) => {
  try {
    let chats = await populateChat(
      Chat.find({ users: { $elemMatch: { $eq: req.user._id } } }).sort({ updatedAt: -1 })
    );
    res.json(chats);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Create group chat
export const createGroupChat = async (req, res) => {
  const { name, users, description } = req.body;
  if (!name || !users) return res.status(400).json({ message: 'Name and users required' });

  let userList = JSON.parse(users);
  if (userList.length < 2) return res.status(400).json({ message: 'At least 2 users needed' });
  userList.push(req.user._id);

  try {
    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: userList,
      groupAdmin: [req.user._id],
      groupDescription: description || '',
      groupInviteLink: crypto.randomBytes(10).toString('hex'),
    });

    const fullChat = await populateChat(Chat.findById(groupChat._id));
    res.status(201).json(fullChat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Rename group
export const renameGroup = async (req, res) => {
  try {
    const chat = await populateChat(
      Chat.findByIdAndUpdate(req.params.chatId, { chatName: req.body.chatName }, { new: true })
    );
    res.json(chat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Update group description
export const updateGroupDescription = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(req.params.chatId, { groupDescription: req.body.description }, { new: true });
    res.json(chat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Add user to group
export const addToGroup = async (req, res) => {
  try {
    const chat = await populateChat(
      Chat.findByIdAndUpdate(req.params.chatId, { $addToSet: { users: req.body.userId } }, { new: true })
    );
    res.json(chat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Remove user from group
export const removeFromGroup = async (req, res) => {
  try {
    const chat = await populateChat(
      Chat.findByIdAndUpdate(req.params.chatId, { $pull: { users: req.body.userId, groupAdmin: req.body.userId } }, { new: true })
    );
    res.json(chat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Promote to admin
export const promoteAdmin = async (req, res) => {
  try {
    const chat = await populateChat(
      Chat.findByIdAndUpdate(req.params.chatId, { $addToSet: { groupAdmin: req.body.userId } }, { new: true })
    );
    res.json(chat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Archive/unarchive chat
export const archiveChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.users.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const archived = chat.archivedBy.includes(req.user._id);
    if (archived) chat.archivedBy = chat.archivedBy.filter(u => u.toString() !== req.user._id.toString());
    else chat.archivedBy.push(req.user._id);
    await chat.save();
    const updated = await populateChat(Chat.findById(chat._id));
    res.json({ archived: !archived, chat: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Mute/unmute chat
export const muteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    const muted = chat.mutedBy.includes(req.user._id);
    if (muted) chat.mutedBy = chat.mutedBy.filter(u => u.toString() !== req.user._id.toString());
    else chat.mutedBy.push(req.user._id);
    await chat.save();
    res.json({ muted: !muted });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
