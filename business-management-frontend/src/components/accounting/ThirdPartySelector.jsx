/**
 * ThirdPartySelector
 * Buscador async de terceros (clientes, proveedores, etc.)
 * con soporte a teclado.
 *
 * Props:
 *   value       : { id, display_name, document_number } | null
 *   onChange    : (thirdParty | null) => void
 *   placeholder : string
 *   disabled    : bool
 *   required    : bool
 *   error       : string
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { thirdPartiesApi } from '../../api/modules/thirdParties';

export default function ThirdPartySelector({
  value,
  onChange,
  placeholder = 'Buscar tercero...',
  disabled = false,
  required = false,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Cierra al clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Búsqueda debounced
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await thirdPartiesApi.search(query);
        setResults(res.data.data ?? res.data ?? []);
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

  const handleSelect = useCallback((tp) => {
    onChange(tp);
    setOpen(false);
    setQuery('');
    setResults([]);
  }, [onChange]);

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

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

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      listRef.current.children[cursor]?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  // Nombre a mostrar: business_name o "first_name last_name"
  const displayName = value
    ? (value.display_name ?? value.business_name ?? `${value.first_name ?? ''} ${value.last_name ?? ''}`.trim())
    : null;

  return (
    <div ref={containerRef} className="relative">
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
            <span className="flex-1 truncate text-xs text-gray-900 dark:text-white">{displayName}</span>
            <span className="font-mono text-xs text-gray-400 shrink-0">{value.document_number}</span>
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
            {required && <span className="text-red-500 text-xs shrink-0">*</span>}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden min-w-64">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100 dark:border-gray-700">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCursor(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Nombre, NIT, email..."
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
            />
            {loading && (
              <div className="w-3.5 h-3.5 border border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>

          <div ref={listRef} className="max-h-56 overflow-y-auto">
            {results.length === 0 && query.trim() && !loading ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                Sin resultados para "{query}"
              </div>
            ) : results.length === 0 && !query.trim() ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                Escribe para buscar terceros
              </div>
            ) : (
              results.map((tp, i) => {
                const name = tp.display_name
                  ?? tp.business_name
                  ?? `${tp.first_name ?? ''} ${tp.last_name ?? ''}`.trim();
                return (
                  <button
                    key={tp.id}
                    type="button"
                    onMouseDown={() => handleSelect(tp)}
                    className={`
                      w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors
                      ${cursor === i
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{name}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {tp.document_type} {tp.document_number}
                        {tp.dv ? `-${tp.dv}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                      tp.type === 'cliente'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : tp.type === 'proveedor'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {tp.type}
                    </span>
                  </button>
                );
              })
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
