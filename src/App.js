import React, { useState } from 'react';
import UploadZone from './components/UploadZone';
import ResultsTable from './components/ResultsTable';
import StatsBar from './components/StatsBar';
import Modal from './components/Modal';
import { sanitizeEmails } from './utils/sanitizeEmails';
import { downloadCSV } from './utils/downloadCSV';
import { SAMPLE_EMAILS } from './utils/sampleData';

function App() {
  const [emails, setEmails]             = useState([]);
  const [results, setResults]           = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]         = useState({ current: 0, total: 0 });
  const [error, setError]               = useState('');

  const handleEmailsLoaded = (loaded) => {
    setEmails(loaded);
    setResults([]);
    setError('');
  };

  const handleLoadSample = () => {
    setEmails(SAMPLE_EMAILS);
    setResults([]);
    setError('');
  };

  const handleSanitize = async () => {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      setError('API key not set. Open .env, replace "your_key_here" with your Anthropic API key, then restart the dev server.');
      return;
    }
    if (emails.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    setError('');
    setProgress({ current: 0, total: emails.length });

    try {
      const sanitized = await sanitizeEmails(emails, apiKey, (current, total) =>
        setProgress({ current, total })
      );
      setResults(sanitized);
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const [modal, setModal] = useState({ open: false, title: '', data: [] });

  const openModal  = (title, data) => setModal({ open: true, title, data });
  const closeModal = () => setModal({ open: false, title: '', data: [] });

  const hasEmails  = emails.length > 0;
  const hasResults = results.length > 0;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">✉</div>
            <div>
              <h1>Email Sanitization Tool</h1>
              <p className="header-sub">AI-powered email list cleaning &amp; validation</p>
            </div>
          </div>
          {/* <span className="header-badge">Powered by Claude</span> */}
        </div>
      </header>

      <main className="app-main">
        {/* ── Upload card ── */}
        <div className="upload-card">
          <p className="upload-card-title">Step 1 — Upload or load emails</p>
          <UploadZone onEmailsLoaded={handleEmailsLoaded} />

          <div className="action-toolbar" style={{ marginTop: '1rem' }}>
            {/* <button className="btn btn-secondary" onClick={handleLoadSample} disabled={isProcessing}>
              ⚡ Sample Data
            </button> */}

            <button className="btn btn-primary" onClick={handleSanitize} disabled={!hasEmails || isProcessing}>
              {isProcessing ? (
                <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Processing…</>
              ) : (
                <>✦ {hasEmails ? `Sanitize ${emails.length} Email${emails.length !== 1 ? 's' : ''}` : 'Sanitize Emails'}</>
              )}
            </button>

            {hasResults && (
              <button className="btn btn-success" onClick={() => downloadCSV(results)}>
                ↓ Download CSV
              </button>
            )}

            {hasEmails && !isProcessing && !hasResults && (
              <span className="loaded-pill">
                {emails.length} email{emails.length !== 1 ? 's' : ''} ready
              </span>
            )}
          </div>
        </div>

        {/* ── Progress ── */}
        {isProcessing && (
          <div className="progress-card">
            <div className="progress-header">
              <div className="spinner" />
              <span className="progress-text">
                Processing {progress.current} of {progress.total} emails…
              </span>
              <span className="progress-pct">{pct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Results ── */}
        {hasResults && (
          <>
            <StatsBar results={results} onCardClick={openModal} />
            <div className="results-header">
              <span className="results-title">Results</span>
              <span className="results-count">{results.length} emails processed</span>
            </div>
            <ResultsTable results={results} />
          </>
        )}
      </main>

      {modal.open && (
        <Modal title={modal.title} results={modal.data} onClose={closeModal} />
      )}

      <footer className="app-footer">
        Email Sanitization Tool · Powered by Anthropic Claude
      </footer>
    </div>
  );
}

export default App;
