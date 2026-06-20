import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/github-repo-analyser';

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
    await syncIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function syncIndexes() {
  try {
    const { default: Analysis } = await import('../models/Analysis.js');
    await Analysis.collection.dropIndex('owner_1_repo_1').catch(() => {});
    await Analysis.syncIndexes();
  } catch (error) {
    console.warn('Index sync warning:', error.message);
  }
}
