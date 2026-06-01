import React from 'react';

const CONFIG = {
  valid:     { label: 'Valid',     cls: 'badge-valid'     },
  invalid:   { label: 'Invalid',   cls: 'badge-invalid'   },
  duplicate: { label: 'Duplicate', cls: 'badge-duplicate' },
  error:     { label: 'Error',     cls: 'badge-error'     },
};

function StatusBadge({ status }) {
  const { label, cls } = CONFIG[status] || CONFIG.error;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default StatusBadge;
