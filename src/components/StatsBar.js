import React from 'react';

const CARDS = [
  { key: 'total',      label: 'Total',      icon: '📊', variant: 'total',      filter: ()  => true },
  { key: 'valid',      label: 'Valid',       icon: '✅', variant: 'valid',      filter: (r) => r.status === 'valid' },
  { key: 'fixed',      label: 'Fixed',       icon: '🔧', variant: 'fixed',      filter: (r) => r.status === 'fixed' },
  { key: 'suspicious', label: 'Suspicious',  icon: '⚠️', variant: 'suspicious', filter: (r) => r.status === 'suspicious' },
  { key: 'duplicate',  label: 'Duplicate',   icon: '🔁', variant: 'duplicate',  filter: (r) => r.status === 'duplicate' },
  { key: 'invalid',    label: 'Invalid',     icon: '🚫', variant: 'invalid',    filter: (r) => r.status === 'invalid' },
];

function StatsBar({ results, onCardClick }) {
  const counts = {
    total:      results.length,
    valid:      results.filter((r) => r.status === 'valid').length,
    fixed:      results.filter((r) => r.status === 'fixed').length,
    suspicious: results.filter((r) => r.status === 'suspicious').length,
    duplicate:  results.filter((r) => r.status === 'duplicate').length,
    invalid:    results.filter((r) => r.status === 'invalid').length,
  };

  // Only show cards that have at least 1 result (except Total always shown)
  const visibleCards = CARDS.filter(
    (c) => c.key === 'total' || counts[c.key] > 0
  );

  return (
    <div className="stats-bar">
      {visibleCards.map((card) => {
        const value = counts[card.key];
        const pct   = counts.total > 0 ? Math.round((value / counts.total) * 100) : 0;
        return (
          <div
            key={card.key}
            className={`stat-card stat-${card.variant} stat-clickable`}
            onClick={() => onCardClick(card.label, results.filter(card.filter))}
            title={`Click to view ${card.label} emails`}
          >
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-body">
              <span className="stat-value">{value}</span>
              <span className="stat-label">{card.label}</span>
              {card.key !== 'total' && (
                <span className="stat-pct">{pct}% of total</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatsBar;
