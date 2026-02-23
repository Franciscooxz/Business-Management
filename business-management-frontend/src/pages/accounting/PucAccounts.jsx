import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, ChevronRight, ChevronDown, BookOpen, X } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { accountingApi } from '../../api/modules/accounting';
import { showSuccess, showError } from '../../utils/toast';
import PucModal from './PucModal';

const NATURE_COLORS = {
  debito: 'text-blue-600 dark:text-blue-400',
  credito: 'text-emerald-600 dark:text-emerald-400',
};

const LEVEL_INDENT = {
  1: 'pl-2',
  2: 'pl-7',
  3: 'pl-12',
  4: 'pl-17',
  5: 'pl-22',
};

const LEVEL_STYLE = {
  1: 'font-bold text-gray-900 dark:text-white text-sm',
  2: 'font-semibold text-gray-800 dark:text-gray-200 text-sm',
  3: 'font-medium text-gray-700 dark:text-gray-300 text-sm',
  4: 'text-gray-600 dark:text-gray-400 text-sm',
  5: 'text-gray-500 dark:text-gray-500 text-xs',
};

function PucRow({ account, onEdit, depth = 0 }) {
  const [open, setOpen] = useState(account.level <= 2);
  const hasChildren = account.children && account.children.length > 0;

  const indent = `pl-${(account.level - 1) * 5 + 2}`;

  return (
    <>
      <tr className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
        <td className="py-2" style={{ paddingLeft: `${(account.level - 1) * 20 + 12}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                onClick={() => setOpen((v) => !v)}
                className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            <span className={`font-mono text-xs ${account.allows_entries ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
              {account.code}
            </span>
          </div>
        </td>
        <td className="py-2 px-3">
          <span className={LEVEL_STYLE[account.level] ?? LEVEL_STYLE[5]}>
            {account.name}
          </span>
        </td>
        <td className="py-2 px-3 hidden sm:table-cell">
          <span className={`text-xs font-medium uppercase ${NATURE_COLORS[account.nature] ?? 'text-gray-400'}`}>
            {account.nature === 'debito' ? 'Débito' : account.nature === 'credito' ? 'Crédito' : '—'}
          </span>
        </td>
        <td className="py-2 px-3 hidden md:table-cell">
          {account.allows_entries ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Auxiliar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
              Grupo
            </span>
          )}
        </td>
        <td className="py-2 px-3 text-right">
          <button
            onClick={() => onEdit(account)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Editar
          </button>
        </td>
      </tr>
      {open && hasChildren && account.children.map((child) => (
        <PucRow key={child.id} account={child} onEdit={onEdit} depth={depth + 1} />
      ))}
    </>
  );
}

export default function PucAccounts() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountingApi.getPucTree();
      setTree(res.data.data ?? res.data);
    } catch {
      showError('Error al cargar el plan de cuentas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Búsqueda debounced
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await accountingApi.getPucList({ search, per_page: 50 });
        setSearchResults(res.data.data ?? []);
      } catch {
        showError('Error en la búsqueda');
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit = (account) => { setSelected(account); setModalOpen(true); };

  const isSearching = search.trim().length > 0;

  return (
    <LayoutNew>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Plan de Cuentas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">PUC Colombia — estructura jerárquica</p>
          </div>
          <button onClick={openCreate} className="btn btn-primary self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nueva Cuenta
          </button>
        </div>

        {/* Búsqueda */}
        <div className="card p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o nombre de cuenta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 h-9 text-sm w-full"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Leyenda */}
        {!isSearching && (
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Débito
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Crédito
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
              Grupo (no imputable)
            </span>
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isSearching ? (
          /* Resultados de búsqueda planos */
          <div className="card overflow-hidden p-0">
            {searchLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Sin resultados para "{search}"</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Naturaleza</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {searchResults.map((acc) => (
                    <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 group">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{acc.code}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-gray-800 dark:text-gray-200">{acc.name}</span>
                        <span className="ml-2 text-xs text-gray-400">Niv. {acc.level}</span>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <span className={`text-xs font-medium ${NATURE_COLORS[acc.nature] ?? 'text-gray-400'}`}>
                          {acc.nature === 'debito' ? 'Débito' : acc.nature === 'credito' ? 'Crédito' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => openEdit(acc)}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : tree.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan de cuentas vacío</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Carga el PUC colombiano estándar o crea cuentas manualmente</p>
            <button onClick={openCreate} className="btn btn-primary mx-auto">
              <Plus className="w-4 h-4" />
              Nueva Cuenta
            </button>
          </div>
        ) : (
          /* Árbol PUC */
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Naturaleza</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {tree.map((account) => (
                  <PucRow key={account.id} account={account} onEdit={openEdit} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <PucModal
          account={selected}
          onClose={() => { setModalOpen(false); setSelected(null); fetchTree(); }}
        />
      )}
    </LayoutNew>
  );
}
