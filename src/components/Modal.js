import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

const PAGE_SIZE = 100;

function ModalActionButtons({ row, overrides, onOverride, editingKey, setEditingKey, editValue, setEditValue }) {
  const key                                     = row._overrideKey || row.cleaned || row.original;
  const action                                  = overrides[key];
  const isFixed                                 = typeof action === 'string' && action.startsWith('fixed:');
  const [confirmingReject, setConfirmingReject] = useState(false);

  if (editingKey === key) {
    const handleSave = () => {
      const val = editValue.trim();
      if (val) onOverride(key, `fixed:${val}`, row);
      setEditingKey(null);
    };
    return (
      <div className="fix-edit">
        <input
          className="fix-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  handleSave();
            if (e.key === 'Escape') setEditingKey(null);
          }}
          autoFocus
          placeholder="Type corrected email…"
        />
        <button className="action-btn fix-save-btn" onClick={handleSave} title="Save fix">✓</button>
        <button className="action-btn fix-cancel-btn" onClick={() => setEditingKey(null)} title="Cancel">✕</button>
      </div>
    );
  }

  if (confirmingReject) {
    return (
      <div className="reject-confirm">
        <span className="reject-confirm-text">Are you sure?</span>
        <button
          className="action-btn reject-btn active"
          onClick={() => { onOverride(key, 'rejected', row); setConfirmingReject(false); }}
        >Yes, Reject</button>
        <button
          className="action-btn fix-cancel-btn"
          onClick={() => setConfirmingReject(false)}
        >Cancel</button>
      </div>
    );
  }

  return (
    <div className="action-btns">
      <button
        className={`action-btn approve-btn ${action === 'approved' ? 'active' : ''}`}
        title="Approve — stay where it is"
        onClick={() => onOverride(key, 'approved', row)}
      >✓ Approve</button>
      <button
        className={`action-btn reject-btn ${action === 'rejected' ? 'active' : ''}`}
        title="Reject — flip to opposite status"
        onClick={() => action === 'rejected' ? onOverride(key, 'rejected', row) : setConfirmingReject(true)}
      >✗ Reject</button>
      <button
        className={`action-btn fix-btn ${isFixed ? 'active' : ''}`}
        title="Fix — manually correct this email"
        onClick={() => {
          setEditingKey(key);
          setEditValue(isFixed ? action.slice(6) : row.original);
        }}
      >✎ Fix</button>
    </div>
  );
}

function Modal({ title, results, onClose, overrides = {}, onOverride = () => {} }) {
  const [page, setPage]               = useState(1);
  const [editingKey, setEditingKey]   = useState(null);
  const [editValue, setEditValue]     = useState('');
  const [selected, setSelected]       = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [issueFilter, setIssueFilter] = useState('');

  const isDuplicate = title === 'Duplicate';
  const showActions = !isDuplicate;

  // Unique issues for filter dropdown
  const issueOptions = [...new Set(results.map(r => r.issue).filter(Boolean))].sort();

  // Filtered results based on selected issue
  const filteredResults = issueFilter ? results.filter(r => r.issue === issueFilter) : results;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !editingKey && !bulkConfirm) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, editingKey, bulkConfirm]);

  useEffect(() => { setEditingKey(null); setSelected(new Set()); }, [page]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [issueFilter]);

  const totalPages  = Math.ceil(filteredResults.length / PAGE_SIZE);
  const start       = (page - 1) * PAGE_SIZE;
  const rows        = filteredResults.slice(start, start + PAGE_SIZE);
  const pageKeys    = rows.map(r => r._overrideKey || r.cleaned || r.original);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every(k => selected.has(k));
  const somePageSelected = pageKeys.some(k => selected.has(k));

  const toggleRow = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        pageKeys.forEach(k => next.delete(k));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        pageKeys.forEach(k => next.add(k));
        return next;
      });
    }
  };

  const executeBulkReject = (keys) => {
    keys.forEach(key => {
      const row = results.find(r => (r._overrideKey || r.cleaned || r.original) === key);
      if (row) onOverride(key, 'rejected', row);
    });
    setSelected(new Set());
    setBulkConfirm(null);
  };

  const allKeys = filteredResults.map(r => r._overrideKey || r.cleaned || r.original);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-subtitle">
              {issueFilter ? `${filteredResults.length} of ${results.length}` : results.length.toLocaleString()} email{results.length !== 1 ? 's' : ''}
              {issueFilter && ' (filtered)'}
            </p>
          </div>
          <div className="modal-header-actions">
            {showActions && (
              <button
                className="bulk-reject-all-btn"
                onClick={() => setBulkConfirm('all')}
                title="Reject all emails in this list"
              >✗ Reject All</button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Issue filter bar */}
        {issueOptions.length > 0 && (
          <div className="modal-filter-bar">
            <span className="modal-filter-label">Filter by issue:</span>
            <select
              className="modal-filter-select"
              value={issueFilter}
              onChange={e => setIssueFilter(e.target.value)}
            >
              <option value="">All ({results.length})</option>
              {issueOptions.map(issue => (
                <option key={issue} value={issue}>
                  {issue} ({results.filter(r => r.issue === issue).length})
                </option>
              ))}
            </select>
            {issueFilter && (
              <button className="modal-filter-clear" onClick={() => setIssueFilter('')}>✕ Clear</button>
            )}
          </div>
        )}

        {/* Bulk action bar */}
        {showActions && selected.size > 0 && !bulkConfirm && (
          <div className="bulk-bar">
            <span className="bulk-bar-count">{selected.size} selected</span>
            <button className="action-btn reject-btn" onClick={() => setBulkConfirm('selected')}>
              ✗ Reject Selected
            </button>
            <button className="action-btn fix-cancel-btn" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        )}

        {/* Bulk confirm bar */}
        {bulkConfirm && (
          <div className="bulk-bar bulk-bar-confirm">
            <span className="bulk-bar-count">
              {bulkConfirm === 'all'
                ? `Reject all ${results.length} emails?`
                : `Reject ${selected.size} selected email${selected.size !== 1 ? 's' : ''}?`}
            </span>
            <button
              className="action-btn reject-btn active"
              onClick={() => executeBulkReject(bulkConfirm === 'all' ? allKeys : [...selected])}
            >Yes, Reject</button>
            <button className="action-btn fix-cancel-btn" onClick={() => setBulkConfirm(null)}>
              Cancel
            </button>
          </div>
        )}

        {/* Table */}
        <div className="modal-body">
          <table className="modal-table">
            <thead>
              <tr>
                {showActions && (
                  <th className="modal-checkbox-th">
                    <input
                      type="checkbox"
                      className="modal-checkbox"
                      checked={allPageSelected}
                      ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                      onChange={toggleAll}
                      title="Select all on this page"
                    />
                  </th>
                )}
                <th>#</th>
                <th>Email</th>
                <th>Status</th>
                {title !== 'Valid' && <th>Issue</th>}
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const key = row._overrideKey || row.cleaned || row.original;
                const isManuallyApproved = row.issue === 'Previously approved' || row.issue === 'Manually approved';
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={start + i}
                    className={`${row._overridden ? 'row-overridden' : ''} ${isSelected ? 'row-selected' : ''}`}
                    onClick={showActions ? () => toggleRow(key) : undefined}
                    style={showActions ? { cursor: 'pointer' } : {}}
                  >
                    {showActions && (
                      <td className="modal-checkbox-td" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="modal-checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                        />
                      </td>
                    )}
                    <td className="modal-row-num">{start + i + 1}</td>
                    <td className="modal-email original">
                      {row.issue && row.issue.toLowerCase().includes('fixed') && row.cleaned && row.cleaned !== row.original ? row.cleaned : row.original}
                      {row.issue && row.issue.toLowerCase().includes('fixed') && row.cleaned && row.cleaned !== row.original && (
                        <span className="email-original-sub">{row.original}</span>
                      )}
                      {isManuallyApproved && <span className="manually-approved-tag">manually approved</span>}
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    {title !== 'Valid' && <td className="modal-issue">{row.issue}</td>}
                    {showActions && (
                      <td className="action-cell" onClick={e => e.stopPropagation()}>
                        <ModalActionButtons
                          row={row}
                          overrides={overrides}
                          onOverride={onOverride}
                          editingKey={editingKey}
                          setEditingKey={setEditingKey}
                          editValue={editValue}
                          setEditValue={setEditValue}
                        />
                        {row._overridden && <span className="overridden-tag">edited</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination modal-pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            <span className="page-info">Page {page} of {totalPages.toLocaleString()} <span className="page-range">({(start+1).toLocaleString()}–{Math.min(start+PAGE_SIZE, results.length).toLocaleString()} of {results.length.toLocaleString()})</span></span>
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
