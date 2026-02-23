import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Save, Send, ChevronDown, Search,
  AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react';
import { electronicInvoiceApi } from '../../api/modules/electronicInvoice';
import api from '../../api/axios';

// ── Constantes DIAN ──────────────────────────────────────────────────────────
const DOC_TYPES = [
  { value: '01', label: 'Factura de Venta' },
  { value: '91', label: 'Nota Crédito' },
  { value: '92', label: 'Nota Débito' },
];

const BUYER_DOC_TYPES = [
  { value: 'NIT', label: 'NIT' },
  { value: 'CC',  label: 'Cédula de Ciudadanía' },
  { value: 'CE',  label: 'Cédula de Extranjería' },
  { value: 'PP',  label: 'Pasaporte' },
  { value: 'TI',  label: 'Tarjeta de Identidad' },
];

const TAX_OPTIONS = [
  { value: 'ZY', label: 'No aplica',    rate: 0    },
  { value: '01', label: 'IVA 0%',       rate: 0    },
  { value: '01', label: 'IVA 5%',       rate: 0.05 },
  { value: '01', label: 'IVA 19%',      rate: 0.19 },
  { value: '04', label: 'INC 4%',       rate: 0.04 },
  { value: '04', label: 'INC 8%',       rate: 0.08 },
  { value: '04', label: 'INC 16%',      rate: 0.16 },
  { value: '03', label: 'ICA',          rate: 0    },
];

const UNIT_CODES = [
  { value: '94', label: 'UND — Unidad' },
  { value: 'KGM', label: 'KGM — Kilogramo' },
  { value: 'LTR', label: 'LTR — Litro' },
  { value: 'MTR', label: 'MTR — Metro' },
  { value: 'BX',  label: 'BX  — Caja' },
  { value: 'HUR', label: 'HUR — Hora' },
  { value: 'DAY', label: 'DAY — Día' },
];

const CORRECTION_CONCEPTS = [
  { value: '1', label: '1 — Devolución de parte de los bienes' },
  { value: '2', label: '2 — Anulación de factura electrónica' },
  { value: '3', label: '3 — Rebaja o descuento parcial' },
  { value: '4', label: '4 — Ajuste de precio' },
  { value: '5', label: '5 — Otro' },
  { value: '6', label: '6 — Descuento total' },
];

// ── Helper de cálculos de línea ──────────────────────────────────────────────
function calcLine(line) {
  const qty        = parseFloat(line.quantity)   || 0;
  const price      = parseFloat(line.unit_price) || 0;
  const discRate   = parseFloat(line.discount_rate) || 0;
  const gross      = qty * price;
  const discValue  = gross * discRate;
  const subtotal   = gross - discValue;
  const taxBase    = subtotal;
  const taxValue   = taxBase * (parseFloat(line.tax_rate) || 0);
  const total      = subtotal + taxValue;
  return { gross, discValue, subtotal, taxBase, taxValue, total };
}

// ── Selector de tercero (comprador) ─────────────────────────────────────────
function ThirdPartySearch({ value, onChange }) {
  const [query, setQuery]     = useState(value?.name ?? '');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const timer = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get('/third-parties/search', { params: { q, per_page: 20 } });
        setResults(res.data.data ?? res.data ?? []);
        setOpen(true);
      } catch { setResults([]); }
    }, 280);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o documento..."
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map(t => (
            <li
              key={t.id}
              onMouseDown={() => {
                onChange(t);
                setQuery(t.business_name ?? `${t.first_name} ${t.last_name}`);
                setOpen(false);
              }}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-sm"
            >
              <span className="font-medium truncate">
                {t.business_name ?? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim()}
              </span>
              <span className="text-xs text-gray-400 ml-2 shrink-0">
                {t.document_type} {t.document_number}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
const newLine = (lineNumber = 1) => ({
  _id:           Math.random().toString(36).slice(2),
  line_number:   lineNumber,
  product_id:    null,
  description:   '',
  unit_code:     '94',
  quantity:      1,
  unit_price:    0,
  discount_rate: 0,
  tax_code:      '01',
  tax_name:      'IVA 19%',
  tax_rate:      0.19,
  standard_code: '',
});

export default function InvoiceCreate() {
  const navigate = useNavigate();

  // ── Formulario principal ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    document_type:        '01',
    resolution_id:        '',
    issue_date:           new Date().toISOString().slice(0, 10),
    issue_time:           new Date().toTimeString().slice(0, 8),
    due_date:             '',
    // Comprador
    buyer_name:           '',
    buyer_document_type:  'NIT',
    buyer_document:       '',
    buyer_nit_dv:         '',
    buyer_email:          '',
    buyer_person_type:    'juridica',
    buyer_address:        '',
    buyer_city:           '',
    buyer_city_code:      '',
    buyer_department_code:'',
    // Corrección (Notas)
    reference_invoice_id: '',
    correction_concept:   '',
    // Otros
    currency:             'COP',
    notes:                '',
  });

  const [lines, setLines]             = useState([newLine(1)]);
  const [resolutions, setResolutions] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState({});

  useEffect(() => {
    electronicInvoiceApi.getResolutions({ active: true })
      .then(res => {
        const data = res.data.data ?? res.data;
        setResolutions(data);
        if (data.length > 0) setForm(f => ({ ...f, resolution_id: String(data[0].id) }));
      })
      .catch(console.error);
  }, []);

  // ── Manejo de líneas ─────────────────────────────────────────────────────
  const addLine = () =>
    setLines(prev => [...prev, newLine(prev.length + 1)]);

  const removeLine = (id) =>
    setLines(prev => prev.filter(l => l._id !== id).map((l, i) => ({ ...l, line_number: i + 1 })));

  const updateLine = (id, field, value) =>
    setLines(prev => prev.map(l => {
      if (l._id !== id) return l;
      const updated = { ...l, [field]: value };
      // Si cambia la selección de impuesto
      if (field === 'tax_select') {
        const opt = TAX_OPTIONS.find(o => `${o.value}_${o.rate}` === value) ?? TAX_OPTIONS[0];
        return { ...updated, tax_code: opt.value, tax_name: opt.label, tax_rate: opt.rate };
      }
      return updated;
    }));

  // ── Totales en tiempo real ────────────────────────────────────────────────
  const totals = lines.reduce(
    (acc, l) => {
      const c = calcLine(l);
      return {
        subtotal:  acc.subtotal  + c.subtotal,
        discount:  acc.discount  + c.discValue,
        taxIva:    acc.taxIva    + (l.tax_code === '01' ? c.taxValue : 0),
        taxInc:    acc.taxInc    + (l.tax_code === '04' ? c.taxValue : 0),
        taxIca:    acc.taxIca    + (l.tax_code === '03' ? c.taxValue : 0),
        total:     acc.total     + c.total,
      };
    },
    { subtotal: 0, discount: 0, taxIva: 0, taxInc: 0, taxIca: 0, total: 0 }
  );

  const fmt = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  // ── Manejo del tercero seleccionado ──────────────────────────────────────
  const handleBuyerSelect = (third) => {
    const name = third.business_name ?? `${third.first_name ?? ''} ${third.last_name ?? ''}`.trim();
    setForm(f => ({
      ...f,
      buyer_name:          name,
      buyer_document_type: third.document_type ?? 'NIT',
      buyer_document:      third.document_number ?? '',
      buyer_nit_dv:        third.nit_dv ?? '',
      buyer_email:         third.email ?? '',
      buyer_person_type:   third.person_type ?? 'juridica',
      buyer_address:       third.address ?? '',
      buyer_city:          third.city ?? '',
    }));
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (sendAfter = false) => {
    setErrors({});
    if (!form.resolution_id) { setErrors({ resolution_id: 'Seleccione una resolución DIAN' }); return; }
    if (!form.buyer_name)    { setErrors({ buyer_name: 'El nombre del comprador es requerido' }); return; }
    if (lines.some(l => !l.description)) {
      setErrors({ items: 'Todas las líneas deben tener descripción' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        resolution_id: parseInt(form.resolution_id),
        items: lines.map((l, i) => ({
          line_number:   i + 1,
          product_id:    l.product_id,
          description:   l.description,
          unit_code:     l.unit_code,
          quantity:      parseFloat(l.quantity),
          unit_price:    parseFloat(l.unit_price),
          discount_rate: parseFloat(l.discount_rate) || 0,
          tax_code:      l.tax_code,
          tax_name:      l.tax_name,
          tax_rate:      parseFloat(l.tax_rate),
          standard_code: l.standard_code || null,
        })),
      };

      const res = await electronicInvoiceApi.createInvoice(payload);
      const created = res.data.data;

      if (sendAfter) {
        try {
          await electronicInvoiceApi.send(created.id);
        } catch { /* el usuario puede reenviar desde el detalle */ }
      }

      navigate(`/electronic-invoice/${created.id}`);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message ?? 'Error al guardar la factura');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Factura Electrónica</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete los datos y líneas del documento DIAN</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar Borrador
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Guardar y Enviar
          </button>
        </div>
      </div>

      {/* Errores globales */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 space-y-1">
            {Object.entries(errors).map(([k, v]) => (
              <p key={k}><span className="font-medium">{k}:</span> {Array.isArray(v) ? v[0] : v}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Panel izquierdo (2 columnas): Datos generales + Comprador ──── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos del documento */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Datos del Documento
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de documento</label>
                <select
                  value={form.document_type}
                  onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Resolución DIAN *</label>
                <select
                  value={form.resolution_id}
                  onChange={e => setForm(f => ({ ...f, resolution_id: e.target.value }))}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.resolution_id ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Seleccionar...</option>
                  {resolutions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.prefix || '(Sin prefijo)'} — Res. {r.resolution_number}
                    </option>
                  ))}
                </select>
                {resolutions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No hay resoluciones activas. Configúrelas primero.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  maxLength={3}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha emisión *</label>
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hora emisión</label>
                <input
                  type="time"
                  step={1}
                  value={form.issue_time}
                  onChange={e => setForm(f => ({ ...f, issue_time: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha vencimiento</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notas y corrección */}
            <div className="grid grid-cols-2 gap-4">
              {form.document_type !== '01' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Factura referenciada</label>
                    <input
                      type="text"
                      placeholder="ID de la factura original"
                      value={form.reference_invoice_id}
                      onChange={e => setForm(f => ({ ...f, reference_invoice_id: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Concepto de corrección</label>
                    <select
                      value={form.correction_concept}
                      onChange={e => setForm(f => ({ ...f, correction_concept: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {CORRECTION_CONCEPTS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Datos del comprador */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Datos del Comprador / Adquirente
            </h2>

            {/* Búsqueda de tercero */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buscar tercero existente</label>
              <ThirdPartySearch onChange={handleBuyerSelect} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre / Razón social *</label>
                <input
                  type="text"
                  value={form.buyer_name}
                  onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.buyer_name ? 'border-red-400' : 'border-gray-300'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo persona</label>
                <select
                  value={form.buyer_person_type}
                  onChange={e => setForm(f => ({ ...f, buyer_person_type: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="juridica">Jurídica</option>
                  <option value="natural">Natural</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo doc. *</label>
                <select
                  value={form.buyer_document_type}
                  onChange={e => setForm(f => ({ ...f, buyer_document_type: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {BUYER_DOC_TYPES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número documento *</label>
                <input
                  type="text"
                  value={form.buyer_document}
                  onChange={e => setForm(f => ({ ...f, buyer_document: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {form.buyer_document_type === 'NIT' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">DV</label>
                  <input
                    type="text"
                    value={form.buyer_nit_dv}
                    onChange={e => setForm(f => ({ ...f, buyer_nit_dv: e.target.value }))}
                    maxLength={1}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.buyer_email}
                  onChange={e => setForm(f => ({ ...f, buyer_email: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={form.buyer_city}
                  onChange={e => setForm(f => ({ ...f, buyer_city: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                <input
                  type="text"
                  value={form.buyer_address}
                  onChange={e => setForm(f => ({ ...f, buyer_address: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* ── Líneas de detalle ──────────────────────────────────────────── */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                Ítems / Líneas
              </h2>
              <button
                onClick={addLine}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={15} />
                Agregar línea
              </button>
            </div>

            {errors.items && (
              <p className="px-5 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
                {errors.items}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-semibold text-gray-500 w-6">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Descripción</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500 w-20">Unidad</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500 w-20">Cant.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500 w-28">Precio Unit.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500 w-20">Desc. %</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500 w-28">Impuesto</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500 w-28">Subtotal</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500 w-28">Total línea</th>
                    <th className="w-8 px-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map(line => {
                    const c = calcLine(line);
                    return (
                      <tr key={line._id} className="group">
                        <td className="px-3 py-2 text-gray-400">{line.line_number}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={e => updateLine(line._id, 'description', e.target.value)}
                            placeholder="Descripción del ítem..."
                            className="w-full min-w-[160px] px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={line.unit_code}
                            onChange={e => updateLine(line._id, 'unit_code', e.target.value)}
                            className="w-full px-1 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                          >
                            {UNIT_CODES.map(u => (
                              <option key={u.value} value={u.value}>{u.value}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.0001"
                            step="1"
                            value={line.quantity}
                            onChange={e => updateLine(line._id, 'quantity', e.target.value)}
                            className="w-full text-right px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={e => updateLine(line._id, 'unit_price', e.target.value)}
                            className="w-full text-right px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={Math.round((parseFloat(line.discount_rate) || 0) * 100)}
                            onChange={e => updateLine(line._id, 'discount_rate', String(parseFloat(e.target.value) / 100))}
                            className="w-full text-right px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={`${line.tax_code}_${line.tax_rate}`}
                            onChange={e => updateLine(line._id, 'tax_select', e.target.value)}
                            className="w-full px-1 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                          >
                            {TAX_OPTIONS.map((opt, i) => (
                              <option key={i} value={`${opt.value}_${opt.rate}`}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600 font-mono tabular-nums">
                          {new Intl.NumberFormat('es-CO').format(Math.round(c.subtotal))}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800 font-mono tabular-nums">
                          {new Intl.NumberFormat('es-CO').format(Math.round(c.total))}
                        </td>
                        <td className="px-2 py-2">
                          {lines.length > 1 && (
                            <button
                              onClick={() => removeLine(line._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-opacity"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ── Panel derecho: Resumen financiero ─────────────────────────── */}
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 sticky top-6">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Resumen
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal bruto</span>
                <span className="font-mono">{fmt(totals.subtotal + totals.discount)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>− Descuentos</span>
                  <span className="font-mono">−{fmt(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Base gravable</span>
                <span className="font-mono">{fmt(totals.subtotal)}</span>
              </div>
              {totals.taxIva > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>IVA</span>
                  <span className="font-mono">{fmt(totals.taxIva)}</span>
                </div>
              )}
              {totals.taxInc > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>INC</span>
                  <span className="font-mono">{fmt(totals.taxInc)}</span>
                </div>
              )}
              {totals.taxIca > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>ICA</span>
                  <span className="font-mono">{fmt(totals.taxIca)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg text-gray-900">
                <span>Total</span>
                <span className="font-mono text-blue-700">{fmt(totals.total)}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar Borrador
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Guardar y Enviar a DIAN
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center pt-1">
              {lines.length} ítem{lines.length !== 1 ? 's' : ''}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
