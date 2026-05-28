import React, { useState, useEffect, useRef } from 'react';
import UploadZone    from './components/UploadZone';
import ResultsTable  from './components/ResultsTable';
import StatsBar      from './components/StatsBar';
import Modal         from './components/Modal';
import { downloadCSV }   from './utils/downloadCSV';
import { SAMPLE_EMAILS } from './utils/sampleData';

function App() {
  const [emails, setEmails]             = useState([]);
  const [results, setResults]           = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]         = useState({ current: 0, total: 0, phase: '' });
  const [error, setError]               = useState('');
  const [modal, setModal]               = useState({ open: false, title: '', data: [] });
  const pollRef                         = useRef(null);

  const openModal  = (title, data) => setModal({ open: true, title, data });
  const closeModal = () => setModal({ open: false, title: '', data: [] });

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleEmailsLoaded = (loaded) => { setEmails(loaded); setResults([]); setError(''); };
  const handleLoadSample   = () => { setEmails(SAMPLE_EMAILS); setResults([]); setError(''); };

  const startPolling = (jobId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/progress/${jobId}`);
        if (!res.ok) throw new Error('Progress fetch failed');
        const job = await res.json();
        setProgress({ current: job.current, total: job.total, phase: job.phase });
        if (job.status === 'done') {
          clearInterval(pollRef.current);
          setResults(job.results || []);
          setIsProcessing(false);
        } else if (job.status === 'error') {
          clearInterval(pollRef.current);
          setError(`Processing failed: ${job.error}`);
          setIsProcessing(false);
        }
      } catch (err) {
        clearInterval(pollRef.current);
        setError(`Connection error: ${err.message}`);
        setIsProcessing(false);
      }
    }, 1000);
  };

  const handleSanitize = async () => {
    if (emails.length === 0) return;
    setIsProcessing(true); setResults([]); setError('');
    setProgress({ current: 0, total: emails.length, phase: 'Starting…' });
    try {
      const res = await fetch('/api/sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Server error ${res.status}`); }
      const { jobId } = await res.json();
      startPolling(jobId);
    } catch (err) {
      setError(`Failed to start: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const pct        = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const hasEmails  = emails.length > 0;
  const hasResults = results.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">✉</div>
            <div>
              <h1>Email Sanitization Tool</h1>
              <p className="header-sub">7-layer AI-powered email validation pipeline</p>
            </div>
          </div>
          <span className="header-badge">Powered by Claude</span>
        </div>
      </header>

      <main className="app-main">
        <div className="upload-card">
          <p className="upload-card-title">Upload or load emails</p>
          <UploadZone onEmailsLoaded={handleEmailsLoaded} />
          <div className="action-toolbar" style={{ marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleLoadSample} disabled={isProcessing}>⚡ Sample Data</button>
            <button className="btn btn-primary" onClick={handleSanitize} disabled={!hasEmails || isProcessing}>
              {isProcessing
                ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> {progress.phase}</>
                : <>✦ {hasEmails ? `Sanitize ${emails.length} Email${emails.length !== 1 ? 's' : ''}` : 'Sanitize Emails'}</>}
            </button>
            {hasResults && <button className="btn btn-success" onClick={() => downloadCSV(results)}>↓ Download CSV</button>}
            {hasEmails && !isProcessing && !hasResults && (
              <span className="loaded-pill">{emails.length} email{emails.length !== 1 ? 's' : ''} ready</span>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="progress-card">
            <div className="progress-header">
              <div className="spinner" />
              <span className="progress-text">{progress.phase} — {progress.current.toLocaleString()} of {progress.total.toLocaleString()}</span>
              <span className="progress-pct">{pct}%</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">⚠</span><span>{error}</span>
          </div>
        )}

        {hasResults && (
          <>
            <StatsBar results={results} onCardClick={openModal} />
            <div className="results-header">
              <span className="results-title">Results</span>
              <span className="results-count">{results.length.toLocaleString()} emails processed</span>
            </div>
            <ResultsTable results={results} />
          </>
        )}
      </main>

      {modal.open && <Modal title={modal.title} results={modal.data} onClose={closeModal} />}

      <footer className="app-footer">Email Sanitization Tool · 7-Layer Pipeline · Powered by Anthropic Claude</footer>
    </div>
  );
}

export default App;
