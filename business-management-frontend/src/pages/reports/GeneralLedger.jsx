import { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, ChevronDown } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { reportsApi } from '../../api/modules/reports';
import api from '../../api/axios';
import { showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(Number(v)));
}

const VOUCHER_TYPES = [
  { value: '',           label: 'Todos los tipos' },
  { value: 'ingreso',    label: 'Comprobante de Ingreso' },
  { value: 'egreso',     label: 'Comprobante de Egreso' },
  { value: 'diario',     label: 'Diario' },
  { value: 'ajuste',     label: 'Ajuste' },
  { value: 'nota_debito',  label: 'Nota Débito' },
  { value: 'nota_credito', label: 'Nota Crédito' },
];

export default function GeneralLedger() {
  const today    = new Date().toISOString().split('T')[0];
  const firstDay = today.substring(0, 8) + '01';

  // Estados del Libro Mayor
  const [accounts,    setAccounts]    = useState([]);
  const [accountId,   setAccountId]   = useState('');
  const [startDate,   setStartDate]   = useState(firstDay);
  const [endDate,     setEndDate]     = useState(today);
  const [ledger,      setLedger]      = useState(null);
  const [loadingL,    setLoadingL]    = useState(false);

  // Estados del Libro Diario
  const [tab,         setTab]         = useState('mayor'); // 'mayor' | 'diario'
  const [journal,     setJournal]     = useState(null);
  const [loadingJ,    setLoadingJ]    = useState(false);
  const [voucherType, setVoucherType] = useState('');
  const [search,      setSearch]      = useState('');
  const [journalPage, setJournalPage] = useState(1);
  const [expanded,    setExpanded]    = useState({});

  // Cargar cuentas PUC con movimientos
  useEffect(() => {
    api.get('/accounting/puc', { params: { allows_entries: true } })
      .then(res => setAccounts(res.data.data ?? []))
      .catch(() => {});
  }, []);

  async function generateLedger() {
    if (!accountId) return showError('Selecciona una cuenta');
    setLoadingL(true);
    try {
      const res = await reportsApi.getGeneralLedger({ account_id: accountId, start_date: startDate, end_date: endDate });
      setLedger(res.data.data);
    } catch (err) { showError(err.response?.data?.message ?? 'Error al cargar'); }
    finally { setLoadingL(false); }
  }

  const generateJournal = useCallback(async () => {
    setLoadingJ(true);
    try {
      const res = await reportsApi.getJournal({
        start_date: startDate, end_date: endDate,
        voucher_type: voucherType || undefined,
        search: search || undefined,
        page: journalPage,
      });
      setJournal(res.data);
    } catch (err) { showError(err.response?.data?.message ?? 'Error al cargar'); }
    finally { setLoadingJ(false); }
  }, [startDate, endDate, voucherType, search, journalPage]);

  useEffect(() => {
    if (tab === 'diario') generateJournal();
  }, [tab, generateJournal]);

  function toggleExpand(id) { setExpanded(p => ({ ...p, [id]: !p[id] })); }

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Libros Contables</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Libro Mayor y Libro Diario</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[{ id: 'mayor', label: 'Libro Mayor' }, { id: 'diario', label: 'Libro Diario' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── LIBRO MAYOR ─────────────────────────────────────────────────── */}
        {tab === 'mayor' && (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cuenta PUC</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className={inputCls + ' w-full'}>
                  <option value="">— Seleccionar cuenta —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
              </div>
              <button onClick={generateLedger} disabled={loadingL}
                className="flex items-center gap-2 h-9 px-5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-60">
                {loadingL ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                {loadingL ? 'Cargando...' : 'Consultar'}
              </button>
            </div>

            {ledger && (
              <>
                {/* Info de la cuenta */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      {ledger.account.code} — {ledger.account.name}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Naturaleza: {ledger.account.nature === 'debito' ? 'Débito' : 'Crédito'} &nbsp;|&nbsp;
                      Saldo inicial: ${formatCOP(ledger.opening_balance)} &nbsp;|&nbsp;
                      Saldo final: ${formatCOP(ledger.closing_balance)}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        {['Fecha', 'Comprobante', 'Descripción', 'Tercero', 'Débito', 'Crédito', 'Saldo'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {/* Saldo anterior */}
                      <tr className="bg-yellow-50 dark:bg-yellow-900/10">
                        <td colSpan={6} className="px-4 py-2 text-xs text-yellow-700 dark:text-yellow-400 font-medium">Saldo anterior al {ledger.start_date}</td>
                        <td className="px-4 py-2 text-sm font-mono font-semibold text-right text-yellow-700 dark:text-yellow-400">${formatCOP(ledger.opening_balance)}</td>
                      </tr>
                      {ledger.movements.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{m.date}</td>
                          <td className="px-4 py-2.5 text-xs font-mono text-gray-500 dark:text-gray-400">{m.full_number}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{m.description}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-400 truncate max-w-[120px]">{m.third_party_name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{m.debit > 0 ? formatCOP(m.debit) : '—'}</td>
                          <td className="px-4 py-2.5 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{m.credit > 0 ? formatCOP(m.credit) : '—'}</td>
                          <td className={`px-4 py-2.5 text-sm font-mono text-right font-semibold ${m.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                            ${formatCOP(m.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
                        <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Totales del período</td>
                        <td className="px-4 py-3 text-sm font-mono font-bold text-right text-gray-900 dark:text-white">${formatCOP(ledger.total_debit)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-bold text-right text-gray-900 dark:text-white">${formatCOP(ledger.total_credit)}</td>
                        <td className={`px-4 py-3 text-sm font-mono font-bold text-right ${ledger.closing_balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                          ${formatCOP(ledger.closing_balance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── LIBRO DIARIO ────────────────────────────────────────────────── */}
        {tab === 'diario' && (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
                <select value={voucherType} onChange={e => setVoucherType(e.target.value)} className={inputCls}>
                  {VOUCHER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="relative flex-1 min-w-40">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar</label>
                <Search className="absolute left-3 bottom-2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° o descripción..."
                  className={inputCls + ' pl-9 w-full'} />
              </div>
              <button onClick={() => { setJournalPage(1); generateJournal(); }} disabled={loadingJ}
                className="flex items-center gap-2 h-9 px-5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-60">
                {loadingJ ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                Filtrar
              </button>
            </div>

            {journal && journal.data?.map(v => (
              <div key={v.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button onClick={() => toggleExpand(v.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-4 text-left">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-24">{v.date}</span>
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{v.full_number}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{v.description}</span>
                    {v.third_party_name && <span className="text-xs text-gray-400">— {v.third_party_name}</span>}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-mono text-gray-500">${formatCOP(v.total_debit)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded[v.id] ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expanded[v.id] && v.lines?.length > 0 && (
                  <table className="w-full border-t border-gray-100 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/30">
                        <th className="px-4 py-1.5 text-left text-xs text-gray-400 uppercase">Cuenta</th>
                        <th className="px-4 py-1.5 text-left text-xs text-gray-400 uppercase">Descripción</th>
                        <th className="px-4 py-1.5 text-left text-xs text-gray-400 uppercase">Tercero</th>
                        <th className="px-4 py-1.5 text-right text-xs text-gray-400 uppercase">Débito</th>
                        <th className="px-4 py-1.5 text-right text-xs text-gray-400 uppercase">Crédito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {v.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="px-4 py-1.5 text-xs font-mono text-gray-600 dark:text-gray-400">{l.code} — {l.name}</td>
                          <td className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400">{l.description ?? '—'}</td>
                          <td className="px-4 py-1.5 text-xs text-gray-400">{l.third_party_name ?? '—'}</td>
                          <td className="px-4 py-1.5 text-xs font-mono text-right text-gray-700 dark:text-gray-300">{Number(l.debit) > 0 ? formatCOP(l.debit) : ''}</td>
                          <td className="px-4 py-1.5 text-xs font-mono text-right text-gray-700 dark:text-gray-300">{Number(l.credit) > 0 ? formatCOP(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            {/* Paginación diario */}
            {journal?.meta && journal.meta.last_page > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Página {journal.meta.current_page} de {journal.meta.last_page} ({journal.meta.total} comprobantes)</span>
                <div className="flex gap-2">
                  <button disabled={journalPage <= 1} onClick={() => setJournalPage(p => p - 1)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">Anterior</button>
                  <button disabled={journalPage >= journal.meta.last_page} onClick={() => setJournalPage(p => p + 1)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </LayoutNew>
  );
}
