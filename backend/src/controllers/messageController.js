import Message from '../models/Message.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Notification from '../models/Notification.js';
import MediaFile from '../models/MediaFile.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';

const populateMessage = (query) =>
  query
    .populate('sender', 'username avatar status')
    .populate('replyTo', 'content sender type')
    .populate('reactions.user', 'username avatar')
    .populate('chat');

const getPublicFileUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/${filename}`;

const markMessagesRead = async (chatId, userId) => {
  await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, readBy: { $ne: userId }, deletedForEveryone: false },
    { $addToSet: { readBy: userId }, $set: { status: 'seen' } }
  );

  await Chat.updateOne(
    { _id: chatId, 'unreadCount.user': userId },
    { $set: { 'unreadCount.$.count': 0 } }
  );
};

// @desc Send a message
export const sendMessage = async (req, res) => {
  const { content, chatId, replyTo, type = 'text' } = req.body;
  if (!chatId) return res.status(400).json({ message: 'chatId required' });

  let fileUrl = '';
  let fileName = '';
  let mediaProvider = 'local';

  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.path, 'chat-io/media');
      fileUrl = result?.secure_url || getPublicFileUrl(req, path.basename(req.file.path));
      fileName = req.file.originalname;
      mediaProvider = result?.secure_url ? 'cloudinary' : 'local';
      if (result?.secure_url && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (err) {
      fileUrl = getPublicFileUrl(req, path.basename(req.file.path));
      fileName = req.file.originalname;
    }
  }

  try {
    let message = await Message.create({
      sender: req.user._id,
      content: content || '',
      chat: chatId,
      type,
      fileUrl,
      fileName,
      replyTo: replyTo || null,
    });

    message = await populateMessage(Message.findById(message._id));
    message = await User.populate(message, { path: 'chat.users', select: 'username avatar email status' });

    if (req.file && fileUrl) {
      await MediaFile.create({
        uploader: req.user._id,
        chat: chatId,
        message: message._id,
        url: fileUrl,
        fileName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        type,
        provider: mediaProvider,
      }).catch(() => {});
    }

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    // Increment unread count for others
    const chat = await Chat.findById(chatId);
    const otherUsers = chat.users.filter(u => u.toString() !== req.user._id.toString());
    for (const userId of otherUsers) {
      const entry = chat.unreadCount.find(e => e.user.toString() === userId.toString());
      if (entry) entry.count += 1;
      else chat.unreadCount.push({ user: userId, count: 1 });
    }
    await chat.save();
    await Notification.insertMany(otherUsers.map((userId) => ({
      user: userId,
      actor: req.user._id,
      chat: chatId,
      message: message._id,
      type: 'message',
      title: message.sender?.username || 'New message',
      body: content || fileName || 'Attachment',
    }))).catch(() => {});

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all messages
export const allMessages = async (req, res) => {
  try {
    const { page = 1, limit = 40 } = req.query;
    const skip = (page - 1) * limit;
    await markMessagesRead(req.params.chatId, req.user._id);
    const messages = await populateMessage(
      Message.find({
        chat: req.params.chatId,
        deletedForEveryone: false,
        deletedFor: { $ne: req.user._id },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    );
    res.json(messages.reverse());
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Mark all messages in a chat as read
export const markChatRead = async (req, res) => {
  try {
    await markMessagesRead(req.params.chatId, req.user._id);
    const messages = await populateMessage(
      Message.find({ chat: req.params.chatId, deletedForEveryone: false })
    );
    res.json({ chatId: req.params.chatId, readBy: req.user._id, messages });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Mark a message delivered
export const markMessageDelivered = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString() && message.status === 'sent') {
      message.status = 'delivered';
      await message.save();
    }
    const updated = await populateMessage(Message.findById(message._id));
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Edit message
export const editMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    message.content = req.body.content;
    message.isEdited = true;
    await message.save();
    const updated = await populateMessage(Message.findById(message._id));
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Delete for me
export const deleteForMe = async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { $addToSet: { deletedFor: req.user._id } });
    res.json({ message: 'Deleted for you' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Delete for everyone
export const deleteForEveryone = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    message.deletedForEveryone = true;
    message.content = 'This message was deleted';
    await message.save();
    res.json({ message: 'Deleted for everyone' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc React to message
export const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    const existing = message.reactions.find(r => r.user.toString() === req.user._id.toString() && r.emoji === emoji);
    if (existing) {
      message.reactions = message.reactions.filter(r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji));
    } else {
      message.reactions.push({ emoji, user: req.user._id });
    }
    await message.save();
    const updated = await populateMessage(Message.findById(message._id));
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Pin message
export const pinMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    message.isPinned = !message.isPinned;
    await message.save();
    await Chat.findByIdAndUpdate(
      message.chat,
      message.isPinned
        ? { $addToSet: { pinnedMessages: message._id } }
        : { $pull: { pinnedMessages: message._id } }
    );
    const updated = await populateMessage(Message.findById(message._id));
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Star message
export const starMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    const starred = message.isStarred.includes(req.user._id);
    const updated = await populateMessage(
      Message.findByIdAndUpdate(
        req.params.id,
        starred ? { $pull: { isStarred: req.user._id } } : { $addToSet: { isStarred: req.user._id } },
        { new: true }
      )
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Search messages
export const searchMessages = async (req, res) => {
  try {
    const { q, chatId } = req.query;
    const messages = await populateMessage(
      Message.find({ chat: chatId, content: { $regex: q, $options: 'i' }, deletedForEveryone: false })
        .limit(20)
    );
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
