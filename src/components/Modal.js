import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

const PAGE_SIZE = 100;

function Modal({ title, results, onClose }) {
  const [page, setPage] = useState(1);

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
              <tr><th>#</th><th>Original Email</th><th>Cleaned Email</th><th>Status</th><th>Issue</th></tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={start + i}>
                  <td className="modal-row-num">{start + i + 1}</td>
                  <td className="modal-email original">{row.original}</td>
                  <td className={`modal-email cleaned ${row.original !== row.cleaned ? 'was-changed' : ''}`}>{row.cleaned}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td className="modal-issue">{row.issue}</td>
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
