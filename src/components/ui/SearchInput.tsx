import { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  'aria-label'?: string;
}

function sanitizeSearchInput(s: string): string {
  return s.replace(/[^\w\s\-_.]/g, '').trim().slice(0, 200);
}

export function SearchInput({
  value,
  onChange,
  onDebouncedChange,
  placeholder = 'Search…',
  debounceMs = 300,
  className = '',
  'aria-label': ariaLabel = 'Search',
}: SearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (onDebouncedChange == null) return;
    const t = setTimeout(() => {
      onDebouncedChange(sanitizeSearchInput(local));
    }, debounceMs);
    return () => clearTimeout(t);
  }, [local, debounceMs, onDebouncedChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setLocal(v);
      onChange(sanitizeSearchInput(v));
    },
    [onChange]
  );

  const clear = useCallback(() => {
    setLocal('');
    onChange('');
    onDebouncedChange?.('');
  }, [onChange, onDebouncedChange]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-2.5 h-4 w-4 text-[var(--text-dim)]" aria-hidden />
      <input
        type="search"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] py-1.5 pl-9 pr-8 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-cyan)] focus:outline-none"
      />
      {local.length > 0 && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 rounded p-0.5 text-[var(--text-dim)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] focus:outline-none"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
