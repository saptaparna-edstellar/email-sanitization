import React, { useState } from 'react';
import UploadZone from './components/UploadZone';
import ResultsTable from './components/ResultsTable';
import StatsBar from './components/StatsBar';
import Modal from './components/Modal';
import { runPipeline }    from './utils/pipeline';
import { sanitizeWithAI } from './utils/sanitizeEmails';
import { downloadCSV }    from './utils/downloadCSV';
import { SAMPLE_EMAILS }  from './utils/sampleData';

function App() {
  const [emails, setEmails]             = useState([]);
  const [results, setResults]           = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]         = useState({ current: 0, total: 0, phase: '' });
  const [error, setError]               = useState('');
  const [modal, setModal]               = useState({ open: false, title: '', data: [] });

  const openModal  = (title, data) => setModal({ open: true, title, data });
  const closeModal = () => setModal({ open: false, title: '', data: [] });

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
      setError('API key not set. Add NEXT_PUBLIC_ANTHROPIC_API_KEY to .env and restart.');
      return;
    }
    if (emails.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    setError('');
    setProgress({ current: 0, total: emails.length, phase: 'Pre-check' });

    try {
      // ── Layers 1–7: pipeline pre-checks ──────────────────────────────────
      const { decided, needsAI, dupeResults } = await runPipeline(
        emails,
        (current, total, phase) => setProgress({ current, total, phase })
      );

      // ── AI layer: only for emails that need deeper verification ──────────
      let aiResults = [];
      if (needsAI.length > 0) {
        setProgress({ current: 0, total: needsAI.length, phase: 'AI verification' });
        aiResults = await sanitizeWithAI(
          needsAI,
          apiKey,
          (current, total, phase) => setProgress({ current, total, phase })
        );
      }

      // ── Merge: pipeline decisions + AI results + duplicates ───────────────
      const merged = [];

      // Preserve original upload order
      for (const email of emails) {
        const norm = email.toLowerCase().trim();

        // Check pipeline decided
        const decided_result = decided.get(norm);
        if (decided_result) { merged.push(decided_result); continue; }

        // Check AI results
        const ai = aiResults.find((r) => r.original === norm);
        if (ai) { merged.push(ai); continue; }

        // Check duplicates
        const dupe = dupeResults.find((r) => r.original === norm);
        if (dupe) { merged.push(dupe); continue; }

        // Fallback (should not happen)
        merged.push({ original: norm, cleaned: norm, status: 'error', issue: 'Not processed' });
      }

      setResults(merged);
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

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
              <p className="header-sub">7-layer AI-powered email validation pipeline</p>
            </div>
          </div>
          <span className="header-badge">Powered by Claude</span>
        </div>
      </header>

      <main className="app-main">
        {/* ── Upload card ── */}
        <div className="upload-card">
          <p className="upload-card-title">Upload or load emails</p>
          <UploadZone onEmailsLoaded={handleEmailsLoaded} />

          <div className="action-toolbar" style={{ marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleLoadSample} disabled={isProcessing}>
              ⚡ Sample Data
            </button>

            <button className="btn btn-primary" onClick={handleSanitize} disabled={!hasEmails || isProcessing}>
              {isProcessing ? (
                <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> {progress.phase}…</>
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
                {progress.phase}: {progress.current} of {progress.total}
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
        Email Sanitization Tool · 7-Layer Pipeline · Powered by Anthropic Claude
      </footer>
    </div>
  );
}

export default App;
