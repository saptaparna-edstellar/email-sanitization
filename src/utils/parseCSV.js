import Papa from 'papaparse';

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];

        if (headers.length === 0) {
          reject(new Error('No columns found in CSV.'));
          return;
        }

        // Prefer a column literally named "email", else fall back to first column
        const emailCol =
          headers.find((h) => h.trim().toLowerCase() === 'email') || headers[0];

        const emails = results.data
          .map((row) => (row[emailCol] || '').toString().trim())
          .filter((e) => e !== '');

        if (emails.length === 0) {
          reject(new Error('No email values found in CSV.'));
          return;
        }

        resolve(emails);
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}
