import React, { useState, useEffect, useMemo } from 'react';
import UploadZone       from './components/UploadZone';
import ResultsTable     from './components/ResultsTable';
import StatsBar         from './components/StatsBar';
import Modal            from './components/Modal';
import ChangeLogDrawer  from './components/ChangeLogDrawer';
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
  const [changeLog, setChangeLog]       = useState([]);
  const [drawerOpen, setDrawerOpen]     = useState(false);

  const openModal  = (title, filter) => setModal({ open: true, title, filter });
  const closeModal = () => setModal({ open: false, title: '', filter: null });

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
    const key    = r.cleaned || r.original;
    const action = overrides[key];
    if (!action) return r;
    if (action === 'approved') return { ...r, issue: 'Manually approved', _overridden: true, _originalStatus: r.status };
    if (action === 'rejected') {
      const flipped = r.status === 'valid' ? 'invalid' : 'valid';
      const issue   = flipped === 'valid' ? 'Decision rejected — moved to valid' : 'Decision rejected — moved to invalid';
      return { ...r, status: flipped, issue, _overridden: true, _originalStatus: r.status };
    }
    if (typeof action === 'string' && action.startsWith('fixed:')) {
      const newEmail = action.slice(6).trim();
      return { ...r, status: 'valid', original: r.original, cleaned: newEmail, issue: `Manually fixed to: ${newEmail}`, _overridden: true, _originalStatus: r.status };
    }
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

    const fromStatus = originalResult?._originalStatus || originalResult?.status || 'unknown';
    const toStatus   = action === 'approved' ? fromStatus
                     : action === 'rejected' ? (fromStatus === 'valid' ? 'invalid' : 'valid')
                     : typeof action === 'string' && action.startsWith('fixed:') ? 'valid'
                     : 'unknown';

    setChangeLog(prev => [
      ...prev,
      {
        id:         Date.now() + Math.random(),
        email:      cleanedEmail,
        action,
        fromStatus,
        toStatus,
        undone:     isToggleOff,
        time:       new Date(),
      },
    ]);

    if (isToggleOff || !originalResult || !action) return;
    const learned = loadLearned();
    learned.trustedEmails = learned.trustedEmails || [];
    learned.blockedEmails = learned.blockedEmails || [];

    if (action === 'approved') {
      if (fromStatus === 'valid') {
        if (!learned.trustedEmails.includes(cleanedEmail)) learned.trustedEmails.push(cleanedEmail);
        learned.blockedEmails = learned.blockedEmails.filter(e => e !== cleanedEmail);
      } else {
        if (!learned.blockedEmails.includes(cleanedEmail)) learned.blockedEmails.push(cleanedEmail);
        learned.trustedEmails = learned.trustedEmails.filter(e => e !== cleanedEmail);
      }
    } else if (action === 'rejected') {
      if (fromStatus === 'valid') {
        // rejecting a valid decision → block it
        if (!learned.blockedEmails.includes(cleanedEmail)) learned.blockedEmails.push(cleanedEmail);
        learned.trustedEmails = learned.trustedEmails.filter(e => e !== cleanedEmail);
      } else {
        // rejecting an invalid decision → trust it
        if (!learned.trustedEmails.includes(cleanedEmail)) learned.trustedEmails.push(cleanedEmail);
        learned.blockedEmails = learned.blockedEmails.filter(e => e !== cleanedEmail);
      }
    } else if (typeof action === 'string' && action.startsWith('fixed:')) {
      const newEmail = action.slice(6).trim();
      // Trust both the original (typo) and the corrected email
      if (!learned.trustedEmails.includes(cleanedEmail)) learned.trustedEmails.push(cleanedEmail);
      if (newEmail && !learned.trustedEmails.includes(newEmail)) learned.trustedEmails.push(newEmail);
      learned.blockedEmails = learned.blockedEmails.filter(e => e !== cleanedEmail && e !== newEmail);
      // Save both directions so pipeline can show the right message
      learned.fixedFrom            = learned.fixedFrom || {};
      learned.fixedTo              = learned.fixedTo   || {};
      learned.fixedFrom[newEmail]  = cleanedEmail;
      learned.fixedTo[cleanedEmail] = newEmail;
    }
    saveLearned(learned);
  };

  const handleEmailsLoaded = (loaded) => { setEmails(loaded); setResults([]); setError(''); setOverrides({}); };
  const handleLoadSample   = () => { setEmails(SAMPLE_EMAILS); setResults([]); setError(''); setOverrides({}); };

  const handleSanitize = async () => {
    if (emails.length === 0) return;
    setIsProcessing(true); setResults([]); setError(''); setOverrides({});
    setProgress({ current: 0, total: emails.length, phase: 'Processing…' });
    const learned = loadLearned();
    try {
      const res = await fetch('/api/sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, learned }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Server error ${res.status}`); }
      const { results: data } = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setProgress({ current: emails.length, total: emails.length, phase: 'Complete' });
    } catch (err) {
      setError(`Failed: ${err.message}`);
    } finally {
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
          {/* <button className="changelog-trigger-btn" onClick={() => setDrawerOpen(true)} title="View change log">
            &#x1F4CB; Changes
            {changeLog.length > 0 && <span className="changelog-trigger-count">{changeLog.length}</span>}
          </button> */}
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

      <ChangeLogDrawer
        log={changeLog}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onClear={() => setChangeLog([])}
      />

      <footer className="app-footer">Email Sanitization Tool · 7-Layer Pipeline · Powered by Anthropic Claude</footer>
    </div>
  );
}

export default App;
