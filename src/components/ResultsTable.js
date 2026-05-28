import React, { useState } from 'react';
import StatusBadge from './StatusBadge';

const PAGE_SIZE = 100;

function ResultsTable({ results }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const start      = (page - 1) * PAGE_SIZE;
  const rows       = results.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="table-container">
        <table className="results-table">
          <thead>
            <tr><th>#</th><th>Original Email</th><th>Cleaned Email</th><th>Status</th><th>Issue</th></tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={start + i} className={`row-${row.status}`}>
                <td className="row-num">{start + i + 1}</td>
                <td className="email-cell original">{row.original}</td>
                <td className={`email-cell cleaned ${row.original !== row.cleaned ? 'was-changed' : ''}`}>{row.cleaned}</td>
                <td><StatusBadge status={row.status} /></td>
                <td className="issue-cell">{row.issue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          <span className="page-info">
            Page {page} of {totalPages.toLocaleString()}
            <span className="page-range"> ({(start+1).toLocaleString()}–{Math.min(start+PAGE_SIZE, results.length).toLocaleString()} of {results.length.toLocaleString()})</span>
          </span>
          <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  );
}

export default ResultsTable;
