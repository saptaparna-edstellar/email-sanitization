import crypto from 'crypto';
import { createJob, cleanOldJobs } from '../../src/lib/jobStore';
import { runServerPipeline }       from '../../src/lib/serverPipeline';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'No emails provided' });
  cleanOldJobs();
  const jobId = crypto.randomUUID();
  createJob(jobId, emails.length);
  runServerPipeline(emails, jobId).catch(err => {
    const { updateJob } = require('../../src/lib/jobStore');
    updateJob(jobId, { status: 'error', error: err.message });
  });
  res.status(200).json({ jobId });
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };
