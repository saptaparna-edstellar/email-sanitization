import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

const PAGE_SIZE = 100;

function ModalActionButtons({ row, overrides, onOverride, editingKey, setEditingKey, editValue, setEditValue }) {
  const key                                     = row._overrideKey || row.cleaned || row.original;
  const action                                  = overrides[key];
  const isFixed                                 = typeof action === 'string' && action.startsWith('fixed:');
  const [confirmingReject, setConfirmingReject] = useState(false);

  // Inline fix editor
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

  // Reject confirmation
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
  const [page, setPage]             = useState(1);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue]   = useState('');
  const isDuplicate = title === 'Duplicate';
  const showActions = !isDuplicate;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !editingKey) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, editingKey]);

  // Reset edit state when page changes
  useEffect(() => { setEditingKey(null); }, [page]);

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const start      = (page - 1) * PAGE_SIZE;
  const rows       = results.slice(start, start + PAGE_SIZE);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-subtitle">{results.length.toLocaleString()} email{results.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <table className="modal-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Email</th>
                <th>Status</th>
                {title !== 'Valid' && <th>Issue</th>}
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isManuallyApproved = row.issue === 'Previously approved' || row.issue === 'Manually approved';
                return (
                <tr key={start + i} className={row._overridden ? 'row-overridden' : ''}>
                  <td className="modal-row-num">{start + i + 1}</td>
                  <td className="modal-email original">
                    {row.original}
                    {isManuallyApproved && <span className="manually-approved-tag">manually approved</span>}
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  {title !== 'Valid' && <td className="modal-issue">{row.issue}</td>}
                  {showActions && (
                    <td className="action-cell">
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
