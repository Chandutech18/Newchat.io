import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    isGroupChat: { type: Boolean, default: false },
    chatName: { type: String, trim: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    groupAdmin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groupAvatar: { type: String, default: '' },
    groupDescription: { type: String, default: '' },
    groupInviteLink: { type: String, default: '' },
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    unreadCount: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

chatSchema.index({ users: 1, updatedAt: -1 });
chatSchema.index({ isGroupChat: 1 });
chatSchema.index({ archivedBy: 1 });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
