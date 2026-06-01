import React from 'react';
import StatusBadge from './StatusBadge';

function actionLabel(entry) {
  if (entry.undone) return 'Undone';
  if (entry.action === 'approved') return 'Approved';
  if (entry.action === 'rejected') return 'Rejected';
  if (typeof entry.action === 'string' && entry.action.startsWith('fixed:'))
    return `Fixed → ${entry.action.slice(6).trim()}`;
  return entry.action;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ChangeLogDrawer({ log, open, onClose, onClear }) {
  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <div className={`drawer ${open ? 'drawer-open' : ''}`}>
        <div className="drawer-header">
          <div>
            <span className="drawer-title">Change Log</span>
            <span className="drawer-subtitle">{log.length} action{log.length !== 1 ? 's' : ''} this session</span>
          </div>
          <div className="drawer-header-btns">
            {log.length > 0 && (
              <button className="drawer-clear-btn" onClick={onClear} title="Clear log">Clear</button>
            )}
            <button className="drawer-close-btn" onClick={onClose} title="Close">&#x2715;</button>
          </div>
        </div>

        <div className="drawer-body">
          {log.length === 0 ? (
            <div className="drawer-empty">
              <div className="drawer-empty-icon">&#x23F3;</div>
              <p>No changes yet.</p>
              <p className="drawer-empty-hint">Approve, reject, or fix emails<br />to see them logged here.</p>
            </div>
          ) : (
            <ul className="changelog-list">
              {[...log].reverse().map((entry) => (
                <li key={entry.id} className={`changelog-item ${entry.undone ? 'changelog-undone' : ''}`}>
                  <div className="changelog-dot-wrap">
                    <div className={`changelog-dot dot-${entry.undone ? 'undone' : entry.action === 'approved' ? 'approved' : entry.action === 'rejected' ? 'rejected' : 'fixed'}`} />
                    <div className="changelog-line" />
                  </div>
                  <div className="changelog-content">
                    <div className="changelog-action-row">
                      <span className={`changelog-action-label label-${entry.undone ? 'undone' : entry.action === 'approved' ? 'approved' : entry.action === 'rejected' ? 'rejected' : 'fixed'}`}>
                        {actionLabel(entry)}
                      </span>
                      <span className="changelog-time">{formatTime(entry.time)}</span>
                    </div>
                    <div className="changelog-email">{entry.email}</div>
                    {!entry.undone && (
                      <div className="changelog-transition">
                        <StatusBadge status={entry.fromStatus} />
                        <span className="changelog-arrow">&#x2192;</span>
                        <StatusBadge status={entry.toStatus} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export default ChangeLogDrawer;
