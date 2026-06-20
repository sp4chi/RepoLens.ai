import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repoUrl: { type: String, required: true },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    repoData: {
      name: String,
      description: String,
      stars: Number,
      forks: Number,
      openIssues: Number,
      language: String,
      topics: [String],
      license: String,
      defaultBranch: String,
      createdAt: String,
      updatedAt: String,
      readme: String,
      languages: mongoose.Schema.Types.Mixed,
      fileTree: [String],
    },
    analysis: {
      summary: String,
      strengths: [String],
      weaknesses: [String],
      techStack: [String],
      useCases: [String],
      recommendations: [String],
      healthScore: Number,
      complexity: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    error: String,
  },
  { timestamps: true }
);

analysisSchema.index({ user: 1, owner: 1, repo: 1 }, { unique: true });

export default mongoose.model('Analysis', analysisSchema);
