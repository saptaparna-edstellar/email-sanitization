import React, { useCallback, useState } from 'react';
import { parseCSV } from '../utils/parseCSV';

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

function UploadZone({ onEmailsLoaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName]     = useState('');
  const [parseError, setParseError] = useState('');

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a .csv file.');
      setFileName('');
      return;
    }
    setParseError('');
    setFileName('');
    try {
      const emails = await parseCSV(file);
      setFileName(`${file.name} — ${emails.length} email${emails.length !== 1 ? 's' : ''} loaded`);
      onEmailsLoaded(emails);
    } catch (err) {
      setParseError(err.message);
    }
  }, [onEmailsLoaded]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".csv"
        id="csv-upload"
        className="upload-input"
        onChange={(e) => processFile(e.target.files[0])}
        onClick={(e) => { e.target.value = null; }}
      />
      <label htmlFor="csv-upload" className="upload-label">
        <div className="upload-icon-wrap">
          <UploadIcon />
        </div>
        <p className="upload-title">
          {isDragging ? 'Release to upload' : 'Drag & drop a CSV or click to browse'}
        </p>
        <p className="upload-hint">
          Detects an "email" column automatically — or uses the first column
        </p>
      </label>

      {fileName   && <p className="upload-success">✓ {fileName}</p>}
      {parseError && <p className="upload-error">⚠ {parseError}</p>}
    </div>
  );
}

export default UploadZone;
