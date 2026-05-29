import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

const PAGE_SIZE = 100;

function ModalActionButtons({ row, overrides, onOverride }) {
  const key    = row.cleaned || row.original;
  const action = overrides[key];
  const status = row._originalStatus || row.status;

  if (status === 'suspicious' || status === 'invalid' || status === 'blocked') {
    return (
      <div className="action-btns">
        <button
          className={`action-btn approve-btn ${action === 'approved' ? 'active' : ''}`}
          title="Approve — move to Valid"
          onClick={() => onOverride(key, action === 'approved' ? null : 'approved', row)}
        >✓ Approve</button>
        <button
          className={`action-btn reject-btn ${action === 'rejected' ? 'active' : ''}`}
          title="Reject — confirm as-is"
          onClick={() => onOverride(key, action === 'rejected' ? null : 'rejected', row)}
        >✗ Reject</button>
      </div>
    );
  }

  if (status === 'fixed') {
    return (
      <div className="action-btns">
        <button
          className={`action-btn retrieve-btn ${action === 'retrieved' ? 'active' : ''}`}
          title="Confirm fix — move to Valid"
          onClick={() => onOverride(key, action === 'retrieved' ? null : 'retrieved', row)}
        >✓ Confirm</button>
        <button
          className={`action-btn reject-btn ${action === 'undone' ? 'active' : ''}`}
          title="Undo fix — restore original"
          onClick={() => onOverride(key, action === 'undone' ? null : 'undone', row)}
        >↩ Undo</button>
      </div>
    );
  }

  return null;
}

function Modal({ title, results, onClose, overrides = {}, onOverride = () => {} }) {
  const [page, setPage] = useState(1);
  const isDuplicate = title === 'Duplicate';

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
                <th>Original Email</th>
                {!isDuplicate && <th>Cleaned Email</th>}
                <th>Status</th>
                <th>Issue</th>
                {!isDuplicate && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={start + i} className={row._overridden ? 'row-overridden' : ''}>
                  <td className="modal-row-num">{start + i + 1}</td>
                  <td className="modal-email original">{row.original}</td>
                  {!isDuplicate && (
                    <td className="modal-email cleaned">
                      {row.cleaned}
                    </td>
                  )}
                  <td><StatusBadge status={row.status} /></td>
                  <td className="modal-issue">{row.issue}</td>
                  {!isDuplicate && (
                    <td className="action-cell">
                      <ModalActionButtons row={row} overrides={overrides} onOverride={onOverride} />
                      {row._overridden && <span className="overridden-tag">edited</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination modal-pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            <span className="page-info">Page {page} of {totalPages.toLocaleString()}<span className="page-range"> ({(start+1).toLocaleString()}–{Math.min(start+PAGE_SIZE, results.length).toLocaleString()} of {results.length.toLocaleString()})</span></span>
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
