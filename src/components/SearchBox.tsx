import React, { useState, useCallback } from 'react';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  resultCount?: number;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, onClear, resultCount }) => {
  const [value, setValue] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      if (v.trim()) {
        onSearch(v.trim());
      } else {
        onClear();
      }
    },
    [onSearch, onClear]
  );

  const handleClear = useCallback(() => {
    setValue('');
    onClear();
  }, [onClear]);

  return (
    <div className="search-box">
      <input
        type="search"
        placeholder="Search nodes by label or IRI…"
        value={value}
        onChange={handleChange}
        className="search-input"
        aria-label="Search nodes"
      />
      {value && (
        <button className="btn-icon" onClick={handleClear} type="button" title="Clear search">
          ✕
        </button>
      )}
      {resultCount !== undefined && value && (
        <span className="search-count">{resultCount} found</span>
      )}
    </div>
  );
};
