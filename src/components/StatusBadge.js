import React from 'react';

const CONFIG = {
  valid:   { label: 'Valid',   cls: 'badge-valid' },
  fixed:   { label: 'Fixed',   cls: 'badge-fixed' },
  invalid: { label: 'Invalid', cls: 'badge-invalid' },
  error:   { label: 'Error',   cls: 'badge-error' },
};

function StatusBadge({ status }) {
  const { label, cls } = CONFIG[status] || CONFIG.error;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default StatusBadge;
