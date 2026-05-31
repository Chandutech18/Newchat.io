import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    callType: { type: String, enum: ['audio', 'video'], required: true },
    status: {
      type: String,
      enum: ['calling', 'accepted', 'rejected', 'missed', 'ended'],
      default: 'calling',
    },
    duration: { type: Number, default: 0 }, // in seconds
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

const Call = mongoose.model('Call', callSchema);
export default Call;
