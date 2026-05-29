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

        // Find the email column by common names, else fall back to first column
        const EMAIL_PATTERNS = [
          'email', 'e-mail', 'email address', 'email id', 'emailid',
          'mail', 'mail id', 'mailid', 'email_address', 'email_id',
          'emailaddress', 'e_mail', 'user email', 'useremail',
          'contact email', 'contactemail', 'work email', 'workemail',
        ];
        const emailCol =
          headers.find((h) => EMAIL_PATTERNS.includes(h.trim().toLowerCase())) ||
          headers[0];

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
