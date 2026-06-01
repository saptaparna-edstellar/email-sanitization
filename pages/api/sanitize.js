import { runServerPipeline } from '../../src/lib/serverPipeline';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { emails, learned = {} } = req.body;
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'No emails provided' });

  try {
    const results = await runServerPipeline(emails, learned);
    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } },
  maxDuration: 60,
};
