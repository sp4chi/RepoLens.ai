import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    githubId: { type: String, sparse: true, unique: true },
    googleId: { type: String, sparse: true, unique: true },
    provider: { type: String, enum: ['github', 'google'], required: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
