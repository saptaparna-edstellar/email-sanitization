import React from 'react';

const CONFIG = {
  valid:      { label: 'Valid',      cls: 'badge-valid'      },
  fixed:      { label: 'Fixed',      cls: 'badge-fixed'      },
  suspicious: { label: 'Suspicious', cls: 'badge-suspicious' },
  duplicate:  { label: 'Duplicate',  cls: 'badge-duplicate'  },
  invalid:    { label: 'Invalid',    cls: 'badge-invalid'    },
  blocked:    { label: 'Blocked',    cls: 'badge-blocked'    },
  error:      { label: 'Error',      cls: 'badge-error'      },
};

function StatusBadge({ status }) {
  const { label, cls } = CONFIG[status] || CONFIG.error;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default StatusBadge;
