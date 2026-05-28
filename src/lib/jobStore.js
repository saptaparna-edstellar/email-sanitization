if (!global._emailJobs) global._emailJobs = new Map();
export const jobs = global._emailJobs;

export function createJob(id, total) {
  jobs.set(id, { status: 'processing', phase: 'Starting…', current: 0, total, results: null, error: null, createdAt: Date.now() });
}
export function updateJob(id, patch) {
  const job = jobs.get(id);
  if (job) Object.assign(job, patch);
}
export function cleanOldJobs() {
  const ONE_HOUR = 60 * 60 * 1000;
  for (const [id, job] of jobs.entries())
    if (Date.now() - job.createdAt > ONE_HOUR) jobs.delete(id);
}
