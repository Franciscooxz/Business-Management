import { useState } from 'react';
import { X, AlertTriangle, TrendingUp, TrendingDown, SlidersHorizontal } from 'lucide-react';
import { inventoryApi } from '../../api/modules/inventory';
import { showSuccess, showError } from '../../utils/toast';

const MANUAL_TYPES = [
  { value: 'entrada',  label: 'Entrada Manual',       icon: TrendingUp,        desc: 'Suma unidades al inventario', color: 'text-emerald-600' },
  { value: 'salida',   label: 'Salida Manual',         icon: TrendingDown,      desc: 'Resta unidades del inventario', color: 'text-red-600' },
  { value: 'ajuste',   label: 'Ajuste de Inventario',  icon: SlidersHorizontal, desc: 'Positivo suma, negativo resta', color: 'text-amber-600' },
  { value: 'inicial',  label: 'Inventario Inicial',    icon: TrendingUp,        desc: 'Saldo inicial del producto', color: 'text-blue-600' },
];

function fmtCOP(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

export default function StockAdjustmentModal({ product, onClose }) {
  const [type, setType] = useState('entrada');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedType = MANUAL_TYPES.find((t) => t.value === type);

  // Vista previa del nuevo saldo
  const qty = parseInt(quantity) || 0;
  const isExit = type === 'salida' || (type === 'ajuste' && qty < 0);
  const delta = type === 'salida' ? -Math.abs(qty) : (type === 'ajuste' ? qty : Math.abs(qty));
  const newStock = (product.stock ?? 0) + delta;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || qty === 0) { showError('La cantidad no puede ser cero'); return; }
    if (type !== 'ajuste' && qty < 0) { showError('Usa Ajuste de Inventario para cantidades negativas'); return; }
    if (newStock < 0) { showError(`Stock insuficiente. Disponible: ${product.stock}`); return; }

    setSaving(true);
    try {
      await inventoryApi.createMovement({
        product_id: product.id,
        type,
        quantity: type === 'salida' ? -Math.abs(qty) : qty,
        unit_cost: parseFloat(unitCost) || undefined,
        reason: reason || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      showSuccess('Movimiento registrado correctamente');
      onClose();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al registrar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Ajuste Manual de Inventario
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo de movimiento */}
          <div>
            <label className="label">Tipo de Movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {MANUAL_TYPES.map((t) => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-primary-600 dark:text-primary-400' : t.color}`} />
                    <div>
                      <p className={`text-xs font-semibold leading-tight ${active ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}`}>
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cantidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={type === 'ajuste' ? '-5 o +10' : '0'}
                className="input h-9 text-sm"
                required
              />
              <p className="text-xs text-gray-400 mt-0.5">
                {type === 'ajuste' ? 'Positivo suma, negativo resta' : 'Unidades positivas'}
              </p>
            </div>
            <div>
              <label className="label">Costo Unitario (opc.)</label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder={fmtCOP(product.avg_cost)?.replace(/[$.]/g, '') ?? '0'}
                min="0"
                step="0.01"
                className="input h-9 text-sm"
              />
              <p className="text-xs text-gray-400 mt-0.5">Actual: {fmtCOP(product.avg_cost)}</p>
            </div>
          </div>

          {/* Vista previa del saldo */}
          {quantity !== '' && qty !== 0 && (
            <div className={`flex items-center gap-2.5 p-3 rounded-lg border ${
              newStock < 0
                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600'
            }`}>
              {newStock < 0 && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Stock actual: </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{product.stock}</span>
                <span className={`mx-2 font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {delta >= 0 ? `+${delta}` : delta}
                </span>
                <span className="text-gray-500 dark:text-gray-400">= </span>
                <span className={`font-bold text-base ${newStock < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {newStock}
                </span>
                {newStock < 0 && (
                  <span className="block text-xs text-red-500 mt-0.5">Stock insuficiente</span>
                )}
              </div>
            </div>
          )}

          {/* Referencia y motivo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Referencia</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="PO-00001, REF-123..."
                className="input h-9 text-sm"
              />
            </div>
            <div>
              <label className="label">Motivo</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Compra, merma, devolución..."
                className="input h-9 text-sm"
                required
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={2}
              className="input text-sm resize-none py-2"
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || newStock < 0 || !quantity || qty === 0}
            >
              {saving ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
