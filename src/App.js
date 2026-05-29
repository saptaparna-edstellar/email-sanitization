import React, { useState, useEffect, useRef, useMemo } from 'react';
import UploadZone    from './components/UploadZone';
import ResultsTable  from './components/ResultsTable';
import StatsBar      from './components/StatsBar';
import Modal         from './components/Modal';
import { downloadCSV }   from './utils/downloadCSV';
import { SAMPLE_EMAILS } from './utils/sampleData';

const LEARNED_KEY = 'email_tool_learned';

function loadLearned() {
  try { return JSON.parse(localStorage.getItem(LEARNED_KEY) || '{}'); } catch { return {}; }
}

function saveLearned(learned) {
  localStorage.setItem(LEARNED_KEY, JSON.stringify(learned));
}

function App() {
  const [emails, setEmails]             = useState([]);
  const [results, setResults]           = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]         = useState({ current: 0, total: 0, phase: '' });
  const [error, setError]               = useState('');
  const [modal, setModal]               = useState({ open: false, title: '', filter: null });
  const [overrides, setOverrides]       = useState({});  // { cleanedEmail: 'approved'|'rejected'|'retrieved' }
  const [learnedInfo, setLearnedInfo]   = useState({ count: 0, trustedDomains: [] });
  const pollRef                         = useRef(null);

  const openModal  = (title, filter) => setModal({ open: true, title, filter });
  const closeModal = () => setModal({ open: false, title: '', filter: null });

  useEffect(() => () => clearInterval(pollRef.current), []);

  // Read localStorage only on client, re-sync after every override change
  useEffect(() => {
    const l = loadLearned();
    setLearnedInfo({
      count: ((l.trustedDomains || []).length) + ((l.trustedEmails || []).length) + ((l.blockedEmails || []).length),
      trustedDomains: l.trustedDomains || [],
    });
  }, [overrides]);

  // Apply overrides on top of raw results for display + CSV
  const displayResults = useMemo(() => results.map(r => {
    const key = r.cleaned || r.original;
    const action = overrides[key];
    if (!action) return r;
    if (action === 'approved')  return { ...r, status: 'valid',   issue: 'Manually approved',        _overridden: true, _originalStatus: r.status };
    if (action === 'retrieved') return { ...r, status: 'valid',   issue: 'Fix confirmed',             _overridden: true, _originalStatus: r.status };
    if (action === 'undone')    return { ...r, status: 'invalid', cleaned: r.original, issue: 'Fix undone — original restored', _overridden: true, _originalStatus: r.status, _overrideKey: key };
    if (action === 'rejected')  return { ...r, _overridden: true, _originalStatus: r.status };
    return r;
  }), [results, overrides]);

  const modalData = modal.filter ? displayResults.filter(modal.filter) : [];

  const handleOverride = (cleanedEmail, action, originalResult) => {
    let isToggleOff = false;
    setOverrides(prev => {
      const next = { ...prev };
      if (next[cleanedEmail] === action) {
        delete next[cleanedEmail];
        isToggleOff = true;
        return next;
      }
      next[cleanedEmail] = action;
      return next;
    });

    // Learn from feedback (skip if toggling off or no context)
    if (isToggleOff || !originalResult || !action) return;
    const domain = cleanedEmail.split('@')[1];
    const learned = loadLearned();
    learned.trustedDomains = learned.trustedDomains || [];
    learned.trustedEmails  = learned.trustedEmails  || [];
    learned.blockedEmails  = learned.blockedEmails  || [];

    if (action === 'approved' || action === 'retrieved') {
      if (!learned.trustedEmails.includes(cleanedEmail)) learned.trustedEmails.push(cleanedEmail);
      if (originalResult.issue && originalResult.issue.includes('Custom company domain')) {
        if (!learned.trustedDomains.includes(domain)) learned.trustedDomains.push(domain);
      }
      learned.blockedEmails = learned.blockedEmails.filter(e => e !== cleanedEmail);
    } else if (action === 'rejected') {
      if (!learned.blockedEmails.includes(cleanedEmail)) learned.blockedEmails.push(cleanedEmail);
      learned.trustedEmails  = learned.trustedEmails.filter(e => e !== cleanedEmail);
      learned.trustedDomains = learned.trustedDomains.filter(d => d !== domain);
    } else if (action === 'undone') {
      // Undo fix: block the cleaned version so next run doesn't re-fix it
      if (!learned.blockedEmails.includes(cleanedEmail)) learned.blockedEmails.push(cleanedEmail);
      learned.trustedEmails = learned.trustedEmails.filter(e => e !== cleanedEmail);
    }
    saveLearned(learned);
  };

  const handleEmailsLoaded = (loaded) => { setEmails(loaded); setResults([]); setError(''); setOverrides({}); };
  const handleLoadSample   = () => { setEmails(SAMPLE_EMAILS); setResults([]); setError(''); setOverrides({}); };

  const startPolling = (jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/progress/${jobId}`);
        if (!res.ok) throw new Error('Progress fetch failed');
        const job = await res.json();
        setProgress({ current: job.current, total: job.total, phase: job.phase });
        if (job.status === 'done') {
          clearInterval(pollRef.current);
          setResults(Array.isArray(job.results) ? job.results : []);
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
    setIsProcessing(true); setResults([]); setError(''); setOverrides({});
    setProgress({ current: 0, total: emails.length, phase: 'Starting…' });
    const learned = loadLearned();
    try {
      const res = await fetch('/api/sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, learned }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Server error ${res.status}`); }
      const { jobId } = await res.json();
      startPolling(jobId);
    } catch (err) {
      setError(`Failed to start: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const pct           = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const hasEmails     = emails.length > 0;
  const hasResults    = results.length > 0;
  const overrideCount = Object.values(overrides).filter(Boolean).length;

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
          {learnedInfo.count > 0 && (
            <span className="header-badge learned-badge" title={`Trusted domains: ${learnedInfo.trustedDomains.join(', ') || 'none'}`}>
              🧠 AI learned {learnedInfo.count} pattern{learnedInfo.count !== 1 ? 's' : ''}
            </span>
          )}
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
            {hasResults && (
              <button className="btn btn-success" onClick={() => downloadCSV(displayResults)}>
                ↓ Download CSV{overrideCount > 0 ? ` (${overrideCount} override${overrideCount !== 1 ? 's' : ''})` : ''}
              </button>
            )}
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
            <StatsBar results={displayResults} onCardClick={openModal} />
            <div className="results-header">
              <span className="results-title">Results</span>
              <span className="results-count">{results.length.toLocaleString()} emails processed</span>
              {overrideCount > 0 && <span className="override-pill">{overrideCount} manual override{overrideCount !== 1 ? 's' : ''}</span>}
            </div>
            <ResultsTable results={displayResults} />
          </>
        )}
      </main>

      {modal.open && <Modal title={modal.title} results={modalData} onClose={closeModal} overrides={overrides} onOverride={handleOverride} />}

      <footer className="app-footer">Email Sanitization Tool · 7-Layer Pipeline · Powered by Anthropic Claude</footer>
    </div>
  );
}

export default App;
