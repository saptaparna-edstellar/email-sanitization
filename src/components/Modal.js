import React, { useEffect } from 'react';
import StatusBadge from './StatusBadge';

function Modal({ title, results, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-subtitle">{results.length} email{results.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Table */}
        <div className="modal-body">
          <table className="modal-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Original Email</th>
                <th>Cleaned Email</th>
                <th>Status</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i}>
                  <td className="modal-row-num">{i + 1}</td>
                  <td className="modal-email original">{row.original}</td>
                  <td className={`modal-email cleaned ${row.original !== row.cleaned ? 'was-changed' : ''}`}>
                    {row.cleaned}
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td className="modal-issue">{row.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default Modal;
