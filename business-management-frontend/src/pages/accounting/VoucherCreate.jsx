import { useState, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckCircle, Save, AlertCircle, Info } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import AccountSelector from '../../components/accounting/AccountSelector';
import ThirdPartySelector from '../../components/accounting/ThirdPartySelector';
import { accountingApi } from '../../api/modules/accounting';
import { showSuccess, showError } from '../../utils/toast';

// ─── Constantes ────────────────────────────────────────────────────────────────
const VOUCHER_TYPES = [
  { value: 'diario',       label: 'Comprobante Diario',  prefix: 'CD' },
  { value: 'ingreso',      label: 'Comprobante de Ingreso',  prefix: 'CI' },
  { value: 'egreso',       label: 'Comprobante de Egreso',   prefix: 'CE' },
  { value: 'ajuste',       label: 'Comprobante de Ajuste',   prefix: 'CA' },
  { value: 'apertura',     label: 'Asiento de Apertura',     prefix: 'AP' },
  { value: 'cierre',       label: 'Asiento de Cierre',       prefix: 'AC' },
  { value: 'nota_debito',  label: 'Nota Débito',             prefix: 'ND' },
  { value: 'nota_credito', label: 'Nota Crédito',            prefix: 'NC' },
];

// Fila vacía nueva
function emptyLine(id) {
  return {
    _id: id,          // clave React local (no va a la API)
    account: null,
    account_id: null,
    third_party: null,
    third_party_id: null,
    description: '',
    debit: '',
    credit: '',
  };
}

// ─── Formateo moneda COP ────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(n));
}

// ─── BalanceBadge ───────────────────────────────────────────────────────────────
function BalanceBadge({ totalDebit, totalCredit }) {
  const diff = Math.abs(totalDebit - totalCredit);
  const balanced = diff < 0.001;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
      ${balanced
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
        : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
      }`}
    >
      {balanced ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span>
        {balanced
          ? 'Comprobante cuadrado'
          : `Diferencia: ${fmt(diff)}`
        }
      </span>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────────
export default function VoucherCreate() {
  const navigate = useNavigate();
  const uid = useId();  // prefijo único para IDs de filas

  const today = new Date().toISOString().split('T')[0];

  // Header
  const [voucherType, setVoucherType] = useState('diario');
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState('');

  // Líneas
  const [lines, setLines] = useState([
    emptyLine(`${uid}-0`),
    emptyLine(`${uid}-1`),
  ]);

  // Estado general
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const nextId = useState(2)[0];
  const lineIdRef = { current: 2 };

  // ── Totales ─────────────────────────────────────────────────────────────────
  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.001;
  const hasLines    = lines.some((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));

  // ── Actualizar fila ─────────────────────────────────────────────────────────
  const updateLine = useCallback((id, field, value) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l._id !== id) return l;
        const updated = { ...l, [field]: value };

        // Cuando cambia debit → limpiar credit y viceversa
        if (field === 'debit' && value !== '') updated.credit = '';
        if (field === 'credit' && value !== '') updated.debit = '';

        // Cuando cambia account → actualizar account_id
        if (field === 'account') {
          updated.account_id = value?.id ?? null;
          // Si la cuenta no requiere tercero, limpiar
          if (!value?.requires_third_party) {
            updated.third_party = null;
            updated.third_party_id = null;
          }
        }
        if (field === 'third_party') updated.third_party_id = value?.id ?? null;

        return updated;
      })
    );
    // Limpiar error de esa línea si lo hay
    setErrors((e) => {
      const ne = { ...e };
      delete ne[`line_${id}`];
      return ne;
    });
  }, []);

  // ── Agregar fila ────────────────────────────────────────────────────────────
  const addLine = useCallback(() => {
    const newId = `${uid}-${lineIdRef.current++}`;
    setLines((prev) => [...prev, emptyLine(newId)]);
  }, [uid]);

  // ── Eliminar fila ───────────────────────────────────────────────────────────
  const removeLine = useCallback((id) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l._id !== id);
    });
  }, []);

  // ── Distribuir contraparte automática ──────────────────────────────────────
  // Completa el lado opuesto de la primera línea vacía cuando solo hay 2 líneas
  const autoBalance = useCallback(() => {
    if (lines.length !== 2) return;
    const diff = totalDebit - totalCredit;
    if (diff === 0) return;
    const [a, b] = lines;
    if (diff > 0 && !b.credit && !b.debit) {
      updateLine(b._id, 'credit', String(diff));
    } else if (diff < 0 && !a.credit && !a.debit) {
      updateLine(a._id, 'debit', String(Math.abs(diff)));
    }
  }, [lines, totalDebit, totalCredit, updateLine]);

  // ── Validar ─────────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!date) errs.date = 'La fecha es requerida';
    if (!hasLines) errs.lines = 'Agrega al menos una línea con cuenta y monto';

    lines.forEach((l, i) => {
      // Ignorar filas completamente vacías
      const isEmpty = !l.account_id && !l.debit && !l.credit;
      if (isEmpty) return;

      if (!l.account_id) errs[`line_${l._id}`] = 'Cuenta requerida';
      const d = parseFloat(l.debit) || 0;
      const c = parseFloat(l.credit) || 0;
      if (d === 0 && c === 0) errs[`line_${l._id}`] = 'Ingresa débito o crédito';
      if (d > 0 && c > 0)     errs[`line_${l._id}`] = 'Solo débito O crédito, no ambos';
    });

    if (!isBalanced && hasLines) errs.balance = 'El comprobante no está cuadrado (Débitos ≠ Créditos)';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Armar payload ───────────────────────────────────────────────────────────
  const buildPayload = (postNow = false) => ({
    voucher_type: voucherType,
    date,
    description,
    status: postNow ? 'posted' : 'draft',
    lines: lines
      .filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map((l) => ({
        account_id: l.account_id,
        third_party_id: l.third_party_id ?? null,
        description: l.description ?? '',
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
  });

  // ── Guardar / Contabilizar ──────────────────────────────────────────────────
  const handleSave = async (postNow = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await accountingApi.createVoucher(buildPayload(postNow));
      const voucher = res.data.data ?? res.data;

      if (postNow) {
        // El backend acepta status:'posted' y contabiliza automáticamente,
        // o podemos llamar post() por separado si el backend lo requiere
        showSuccess(`Comprobante ${voucher.full_number} contabilizado`);
      } else {
        showSuccess(`Borrador ${voucher.full_number ?? '#' + voucher.id} guardado`);
      }
      navigate('/accounting/vouchers');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al guardar el comprobante';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedType = VOUCHER_TYPES.find((t) => t.value === voucherType);

  return (
    <LayoutNew>
      <div className="space-y-5 max-w-5xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Comprobante</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Partida doble — Débitos = Créditos</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/accounting/vouchers')}
            className="btn btn-secondary self-start sm:self-auto text-sm"
          >
            Cancelar
          </button>
        </div>

        {/* ── Datos del encabezado ─────────────────────────────────────────── */}
        <div className="card space-y-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Encabezado
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="label">Tipo</label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
                className="input h-9 text-sm"
              >
                {VOUCHER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prefijo</label>
              <div className="input h-9 text-sm font-mono bg-gray-50 dark:bg-gray-700 flex items-center text-gray-500 cursor-not-allowed select-none">
                {selectedType?.prefix}-XXXXXX
              </div>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`input h-9 text-sm ${errors.date ? 'border-red-400' : ''}`}
                required
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="label">Descripción General</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle del comprobante..."
                className="input h-9 text-sm w-full"
                maxLength={255}
              />
            </div>
          </div>
        </div>

        {/* ── Tabla de líneas ──────────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          {/* Cabecera tabla */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Movimientos
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Info className="w-3 h-3" />
              <span>Solo cuentas auxiliares (nivel 4-5)</span>
            </div>
          </div>

          {/* Thead */}
          <div className="grid gap-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide select-none"
            style={{ gridTemplateColumns: '2fr 1.4fr 1.2fr 90px 90px 32px' }}
          >
            <span>Cuenta PUC</span>
            <span>Tercero</span>
            <span>Descripción</span>
            <span className="text-right">Débito</span>
            <span className="text-right">Crédito</span>
            <span />
          </div>

          {/* Filas */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {lines.map((line, idx) => (
              <VoucherLineRow
                key={line._id}
                line={line}
                lineNumber={idx + 1}
                onUpdate={updateLine}
                onRemove={removeLine}
                canRemove={lines.length > 1}
                error={errors[`line_${line._id}`]}
              />
            ))}
          </div>

          {/* Agregar línea */}
          <div className="px-3 py-2.5 border-t border-dashed border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar línea
            </button>
          </div>

          {/* Totales */}
          <div
            className="grid gap-x-2 px-3 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700 text-sm font-semibold"
            style={{ gridTemplateColumns: '2fr 1.4fr 1.2fr 90px 90px 32px' }}
          >
            <span className="text-gray-600 dark:text-gray-400 col-span-3 text-right pr-2">Totales</span>
            <span className={`text-right font-mono ${totalDebit > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400'}`}>
              {totalDebit > 0 ? fmt(totalDebit) : '—'}
            </span>
            <span className={`text-right font-mono ${totalCredit > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400'}`}>
              {totalCredit > 0 ? fmt(totalCredit) : '—'}
            </span>
            <span />
          </div>
        </div>

        {/* ── Panel inferior: balance + acciones ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Balance indicator */}
          <div className="flex flex-col gap-2">
            {hasLines && <BalanceBadge totalDebit={totalDebit} totalCredit={totalCredit} />}
            {errors.balance && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.balance}
              </p>
            )}
            {errors.lines && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.lines}
              </p>
            )}
            {/* Sugerencia de autobalance */}
            {hasLines && !isBalanced && lines.length === 2 && (
              <button
                type="button"
                onClick={autoBalance}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline self-start"
              >
                Completar contraparte automáticamente
              </button>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving || !hasLines}
              className="btn btn-secondary gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Borrador'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || !hasLines || !isBalanced}
              className="btn btn-primary gap-2 disabled:opacity-50"
              title={!isBalanced ? 'El comprobante debe estar cuadrado para contabilizar' : undefined}
            >
              <CheckCircle className="w-4 h-4" />
              {saving ? 'Procesando...' : 'Contabilizar'}
            </button>
          </div>
        </div>

      </div>
    </LayoutNew>
  );
}

// ─── Fila de movimiento ─────────────────────────────────────────────────────────
function VoucherLineRow({ line, lineNumber, onUpdate, onRemove, canRemove, error }) {
  const requiresThird = line.account?.requires_third_party ?? false;

  return (
    <div>
      <div
        className={`grid gap-x-2 px-3 py-2 items-center ${error ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
        style={{ gridTemplateColumns: '2fr 1.4fr 1.2fr 90px 90px 32px' }}
      >
        {/* Cuenta PUC */}
        <AccountSelector
          value={line.account}
          onChange={(acc) => onUpdate(line._id, 'account', acc)}
          placeholder={`Cuenta #${lineNumber}`}
        />

        {/* Tercero */}
        <ThirdPartySelector
          value={line.third_party}
          onChange={(tp) => onUpdate(line._id, 'third_party', tp)}
          placeholder={requiresThird ? 'Requerido *' : 'Tercero (opc.)'}
          required={requiresThird}
          disabled={false}
        />

        {/* Descripción línea */}
        <input
          type="text"
          value={line.description}
          onChange={(e) => onUpdate(line._id, 'description', e.target.value)}
          placeholder="Descripción..."
          className="input h-9 text-xs px-2"
        />

        {/* Débito */}
        <input
          type="number"
          value={line.debit}
          onChange={(e) => onUpdate(line._id, 'debit', e.target.value)}
          placeholder="0"
          min="0"
          step="1"
          className={`input h-9 text-xs px-2 text-right font-mono
            ${line.debit ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : ''}
          `}
        />

        {/* Crédito */}
        <input
          type="number"
          value={line.credit}
          onChange={(e) => onUpdate(line._id, 'credit', e.target.value)}
          placeholder="0"
          min="0"
          step="1"
          className={`input h-9 text-xs px-2 text-right font-mono
            ${line.credit ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : ''}
          `}
        />

        {/* Eliminar */}
        <button
          type="button"
          onClick={() => onRemove(line._id)}
          disabled={!canRemove}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 disabled:opacity-0 disabled:cursor-default transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error de línea */}
      {error && (
        <p className="text-xs text-red-500 px-3 pb-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
