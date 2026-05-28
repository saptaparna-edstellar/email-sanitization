import React from 'react';
import StatusBadge from './StatusBadge';

function ResultsTable({ results }) {
  return (
    <div className="table-container">
      <table className="results-table">
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
          {results.map((row, i) => {
            const wasChanged = row.original !== row.cleaned;
            return (
              <tr key={i} className={`row-${row.status}`}>
                <td className="row-num">{i + 1}</td>
                <td className="email-cell original">{row.original}</td>
                <td className={`email-cell cleaned ${wasChanged ? 'was-changed' : ''}`}>
                  {row.cleaned}
                </td>
                <td><StatusBadge status={row.status} /></td>
                <td className="issue-cell">{row.issue}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ResultsTable;
