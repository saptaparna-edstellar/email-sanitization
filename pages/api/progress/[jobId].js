import { jobs } from '../../../src/lib/jobStore';

export default function handler(req, res) {
  const { jobId } = req.query;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(job);
}
