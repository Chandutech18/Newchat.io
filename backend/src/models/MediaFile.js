import mongoose from 'mongoose';

const mediaFileSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    url: { type: String, required: true },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document'],
      required: true,
    },
    provider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
  },
  { timestamps: true }
);

mediaFileSchema.index({ chat: 1, createdAt: -1 });
mediaFileSchema.index({ uploader: 1, createdAt: -1 });

const MediaFile = mongoose.model('MediaFile', mediaFileSchema);
export default MediaFile;
