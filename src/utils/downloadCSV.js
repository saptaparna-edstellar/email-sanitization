export function downloadCSV(results) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;

  const header = ['original_email', 'cleaned_email', 'status', 'issue'];
  const rows = results.map((r) => [
    escape(r.original),
    escape(r.cleaned),
    escape(r.status),
    escape(r.issue),
  ]);

  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sanitized_emails.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
