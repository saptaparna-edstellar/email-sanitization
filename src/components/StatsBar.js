import React from 'react';

const CARDS = [
  { key: 'total',   label: 'Total',        icon: '📊', variant: 'total',   filter: () => true },
  { key: 'clean',   label: 'Valid + Fixed', icon: '✅', variant: 'valid',   filter: (r) => r.status === 'valid' || r.status === 'fixed' },
  { key: 'invalid', label: 'Invalid',       icon: '🚫', variant: 'invalid', filter: (r) => r.status === 'invalid' },
  { key: 'error',   label: 'Errors',        icon: '⚠️', variant: 'error',   filter: (r) => r.status === 'error' },
];

function StatsBar({ results, onCardClick }) {
  const counts = {
    total:   results.length,
    clean:   results.filter((r) => r.status === 'valid' || r.status === 'fixed').length,
    invalid: results.filter((r) => r.status === 'invalid').length,
    error:   results.filter((r) => r.status === 'error').length,
  };

  const visibleCards = CARDS.filter(
    (c) => c.key !== 'error' || counts.error > 0
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
