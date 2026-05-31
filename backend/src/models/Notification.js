import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', default: null },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    call: { type: mongoose.Schema.Types.ObjectId, ref: 'Call', default: null },
    type: {
      type: String,
      enum: ['message', 'call', 'missed_call', 'mention', 'contact', 'group'],
      required: true,
    },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ chat: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
