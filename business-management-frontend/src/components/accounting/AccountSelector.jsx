/**
 * AccountSelector
 * Buscador async de cuentas PUC con soporte a teclado.
 * Solo muestra cuentas con allows_entries = true (auxiliares).
 *
 * Props:
 *   value       : { id, code, name } | null
 *   onChange    : (account | null) => void
 *   placeholder : string
 *   disabled    : bool
 *   error       : string
 *   autoFocus   : bool
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { accountingApi } from '../../api/modules/accounting';

export default function AccountSelector({
  value,
  onChange,
  placeholder = 'Buscar cuenta...',
  disabled = false,
  error,
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Cierra al hacer clic fuera
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Búsqueda debounced
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await accountingApi.getPucList({
          search: query,
          allows_entries: 1,
          per_page: 30,
        });
        setResults(res.data.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setCursor(-1);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleSelect = useCallback((acc) => {
    onChange(acc);
    setOpen(false);
    setQuery('');
    setResults([]);
  }, [onChange]);

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  // Navegación con teclado
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && cursor >= 0 && results[cursor]) {
      e.preventDefault();
      handleSelect(results[cursor]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll cursor visible
  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const item = listRef.current.children[cursor];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  const displayCode = value?.code;
  const displayName = value?.name;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={handleOpen}
        className={`
          flex items-center gap-2 h-9 px-2.5 rounded-md border cursor-pointer transition-colors text-sm
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-700 hover:border-primary-400'}
          ${error ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
          ${open ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30' : ''}
        `}
      >
        {value ? (
          <>
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {displayCode}
            </span>
            <span className="flex-1 truncate text-gray-900 dark:text-white text-xs">
              {displayName}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <>
            <span className="flex-1 text-gray-400 dark:text-gray-500 text-xs">{placeholder}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
          {/* Input búsqueda */}
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100 dark:border-gray-700">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCursor(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Código o nombre..."
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              autoFocus={autoFocus}
            />
            {loading && (
              <div className="w-3.5 h-3.5 border border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>

          {/* Resultados */}
          <div ref={listRef} className="max-h-56 overflow-y-auto">
            {results.length === 0 && query.trim() && !loading ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                Sin resultados para "{query}"
              </div>
            ) : results.length === 0 && !query.trim() ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                Escribe para buscar cuentas auxiliares
              </div>
            ) : (
              results.map((acc, i) => (
                <button
                  key={acc.id}
                  type="button"
                  onMouseDown={() => handleSelect(acc)}
                  className={`
                    w-full text-left px-3 py-2 flex items-center gap-3 transition-colors
                    ${cursor === i
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0">
                    {acc.code}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">
                    {acc.name}
                  </span>
                  <span className={`text-xs shrink-0 ${
                    acc.nature === 'debito'
                      ? 'text-blue-500'
                      : 'text-emerald-500'
                  }`}>
                    {acc.nature === 'debito' ? 'Db' : 'Cr'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
