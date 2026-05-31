import { Server } from 'socket.io';
import User from '../models/User.js';
import Message from '../models/Message.js';

const onlineUsers = new Map(); // userId -> Set<socketId>

const setupSocket = (server) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  const io = new Server(server, {
    pingTimeout: 60000,
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // User setup
    socket.on('setup', async (user) => {
      if (!user?._id) return;
      socket.join(user._id);
      const sockets = onlineUsers.get(user._id) || new Set();
      sockets.add(socket.id);
      onlineUsers.set(user._id, sockets);
      await User.findByIdAndUpdate(user._id, { status: 'online' }).catch(() => {});
      socket.broadcast.emit('user online', user._id);
      socket.emit('online users', Array.from(onlineUsers.keys()));
      socket.emit('connected');
    });

    // Join a chat room
    socket.on('join chat', (chatId) => {
      socket.join(chatId);
    });

    // Leave a chat room
    socket.on('leave chat', (chatId) => {
      socket.leave(chatId);
    });

    // Typing indicators
    socket.on('typing', (chatId) => socket.in(chatId).emit('typing', chatId));
    socket.on('stop typing', (chatId) => socket.in(chatId).emit('stop typing', chatId));

    // New message
    socket.on('new message', async (message) => {
      const chat = message.chat;
      if (!chat.users) return;
      let delivered = false;
      chat.users.forEach((user) => {
        if (user._id === message.sender._id) return;
        if (onlineUsers.has(user._id)) delivered = true;
        socket.in(user._id).emit('message received', message);
        socket.in(user._id).emit('notification', {
          type: 'message',
          chatId: chat._id,
          messageId: message._id,
          title: message.sender?.username || 'New message',
          body: message.content || message.fileName || 'Attachment',
        });
      });

      if (delivered && message?._id) {
        await Message.findByIdAndUpdate(message._id, { status: 'delivered' }).catch(() => {});
        io.to(message.sender._id).emit('message delivered', {
          messageId: message._id,
          chatId: chat._id,
          status: 'delivered',
        });
      }
    });

    // Message reactions
    socket.on('message reaction', (data) => {
      socket.in(data.chatId || data.chat?._id).emit('message reaction', data);
    });

    // Message deleted
    socket.on('message deleted', (data) => {
      socket.in(data.chatId).emit('message deleted', data);
    });

    // Message edited
    socket.on('message edited', (data) => {
      socket.in(data.chatId || data.chat?._id).emit('message edited', data);
    });

    // Read receipts
    socket.on('message read', async (data) => {
      if (data?.chatId && data?.userId) {
        await Message.updateMany(
          { chat: data.chatId, sender: { $ne: data.userId }, readBy: { $ne: data.userId } },
          { $addToSet: { readBy: data.userId }, $set: { status: 'seen' } }
        ).catch(() => {});
      }
      socket.in(data.chatId).emit('message read', data);
    });

    // ─── WebRTC Call Signaling ────────────────────────────
    socket.on('call user', (data) => {
      // data: { to, from, signal, callType, callId }
      io.to(data.to).emit('incoming call', data);
      io.to(data.to).emit('notification', {
        type: 'call',
        callId: data.callId,
        title: data.callType === 'video' ? 'Video call' : 'Audio call',
        body: `${data.from?.username || 'Someone'} is calling`,
      });
    });

    socket.on('call accepted', (data) => {
      io.to(data.to).emit('call accepted', data);
    });

    socket.on('call rejected', (data) => {
      io.to(data.to).emit('call rejected', data);
    });

    socket.on('call ended', (data) => {
      io.to(data.to).emit('call ended', data);
    });

    socket.on('ice candidate', (data) => {
      io.to(data.to).emit('ice candidate', data);
    });
    // ─────────────────────────────────────────────────────

    // Disconnect
    socket.on('disconnect', () => {
      onlineUsers.forEach((sockets, userId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size) {
            onlineUsers.set(userId, sockets);
            return;
          }

          onlineUsers.delete(userId);
          User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }).catch(() => {});
          socket.broadcast.emit('user offline', userId);
        }
      });
    });
  });
};

export default setupSocket;
