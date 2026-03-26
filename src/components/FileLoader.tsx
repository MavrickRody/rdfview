import React, { useCallback, useState } from 'react';
import { detectFormat, type ParseFormat } from '../lib/parser';

interface FileLoaderProps {
  onFileSelected: (file: File, format: ParseFormat) => void;
  loading: boolean;
}

const FORMAT_OPTIONS: { value: ParseFormat; label: string }[] = [
  { value: 'turtle', label: 'Turtle (.ttl)' },
  { value: 'rdfxml', label: 'RDF/XML (.rdf / .xml)' },
  { value: 'jsonld', label: 'JSON-LD (.jsonld / .json)' },
  { value: 'nquads', label: 'N-Quads (.nq)' },
];

export const FileLoader: React.FC<FileLoaderProps> = ({ onFileSelected, loading }) => {
  const [dragging, setDragging] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ParseFormat | ''>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const fmt = selectedFormat || detectFormat(file.name, file.type);
      setPendingFile(file);
      onFileSelected(file, fmt);
    },
    [onFileSelected, selectedFormat]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="file-loader">
      <div
        className={`drop-zone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
      >
        <span className="drop-icon">📂</span>
        <p>
          {loading
            ? 'Loading…'
            : pendingFile
              ? `Loaded: ${pendingFile.name}`
              : 'Drop an RDF file here, or click to select'}
        </p>
        <small>Supported: .ttl, .rdf, .xml, .jsonld, .json, .nq</small>
      </div>

      <input
        id="file-input"
        type="file"
        accept=".ttl,.turtle,.rdf,.xml,.jsonld,.json,.nq,.nquads"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      <div className="format-override">
        <label htmlFor="format-select">Format override: </label>
        <select
          id="format-select"
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value as ParseFormat | '')}
        >
          <option value="">Auto-detect</option>
          {FORMAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
