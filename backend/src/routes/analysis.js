import { Router } from 'express';
import Analysis from '../models/Analysis.js';
import { requireAuth } from '../middleware/auth.js';
import { parseRepoUrl, fetchRepoData } from '../services/github.js';
import { analyzeRepo } from '../services/gemini.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user._id, status: 'completed' })
      .sort({ updatedAt: -1 })
      .select('owner repo repoUrl repoData.name repoData.stars repoData.language analysis.healthScore analysis.complexity createdAt updatedAt')
      .limit(50);

    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, user: req.user._id });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl?.trim()) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  let owner;
  let repo;

  try {
    ({ owner, repo } = parseRepoUrl(repoUrl));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let record = await Analysis.findOne({ user: req.user._id, owner, repo });

  if (record?.status === 'completed') {
    return res.json(record);
  }

  if (!record) {
    record = await Analysis.create({
      user: req.user._id,
      repoUrl: repoUrl.trim(),
      owner,
      repo,
      status: 'pending',
    });
  } else {
    record.status = 'pending';
    record.error = undefined;
    await record.save();
  }

  try {
    const repoData = await fetchRepoData(owner, repo);
    const analysis = await analyzeRepo(owner, repo, repoData);

    record.repoData = repoData;
    record.analysis = analysis;
    record.status = 'completed';
    record.error = undefined;
    await record.save();

    res.status(201).json(record);
  } catch (error) {
    record.status = 'failed';
    record.error = error.message;
    await record.save();

    const status = error.response?.status === 404 ? 404 : 500;
    res.status(status).json({
      error: error.response?.status === 404
        ? 'Repository not found on GitHub'
        : error.message,
      id: record._id,
    });
  }
});

export default router;
