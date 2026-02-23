import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { thirdPartiesApi } from '../../api/modules/thirdParties';
import { showSuccess, showError } from '../../utils/toast';

// Calcula dígito de verificación NIT colombiano
function calcDV(nit) {
  const digits = String(nit).replace(/\D/g, '');
  if (!digits) return '';
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const padded = digits.padStart(15, '0');
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += parseInt(padded[i]) * weights[i];
  }
  const rem = sum % 11;
  return rem < 2 ? String(rem) : String(11 - rem);
}

const EMPTY = {
  document_type: 'NIT',
  document_number: '',
  dv: '',
  business_name: '',
  first_name: '',
  last_name: '',
  persona_type: 'juridica',
  tax_regime: 'comun',
  type: 'cliente',
  email: '',
  email_fe: '',
  phone: '',
  address: '',
  city: '',
  department: '',
  country: 'CO',
  withholding_agent: false,
  ica_withholding: false,
  iva_withholding: false,
  notes: '',
};

export default function ThirdPartyModal({ thirdParty, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = !!thirdParty;

  useEffect(() => {
    if (thirdParty) {
      setForm({ ...EMPTY, ...thirdParty });
    }
  }, [thirdParty]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleDocumentChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    set('document_number', val);
    if (form.document_type === 'NIT' && val) {
      set('dv', calcDV(val));
    }
  };

  const handleDocTypeChange = (e) => {
    set('document_type', e.target.value);
    if (e.target.value === 'NIT' && form.document_number) {
      set('dv', calcDV(form.document_number));
    } else {
      set('dv', '');
    }
    // NIT = persona jurídica por defecto
    if (e.target.value === 'NIT') set('persona_type', 'juridica');
    else set('persona_type', 'natural');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.document_number) {
      showError('El número de documento es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await thirdPartiesApi.update(thirdParty.id, form);
        showSuccess('Tercero actualizado');
      } else {
        await thirdPartiesApi.create(form);
        showSuccess('Tercero creado');
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al guardar';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const isNIT = form.document_type === 'NIT';
  const isJuridica = form.persona_type === 'juridica';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Editar Tercero' : 'Nuevo Tercero'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Sección: Documento */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Identificación
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo de Documento</label>
                <select
                  value={form.document_type}
                  onChange={handleDocTypeChange}
                  className="input h-9 text-sm"
                >
                  <option value="NIT">NIT</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PAS">Pasaporte</option>
                  <option value="TE">Tarjeta de Extranjería</option>
                </select>
              </div>
              <div>
                <label className="label">Tipo de Persona</label>
                <select
                  value={form.persona_type}
                  onChange={(e) => set('persona_type', e.target.value)}
                  className="input h-9 text-sm"
                >
                  <option value="juridica">Jurídica</option>
                  <option value="natural">Natural</option>
                </select>
              </div>
              <div className={isNIT ? 'col-span-1' : 'col-span-2'}>
                <label className="label">
                  {isNIT ? 'NIT' : 'Número de Documento'}
                </label>
                <input
                  type="text"
                  value={form.document_number}
                  onChange={handleDocumentChange}
                  className="input h-9 text-sm font-mono"
                  placeholder={isNIT ? '900000000' : ''}
                  required
                />
              </div>
              {isNIT && (
                <div>
                  <label className="label">DV (calculado)</label>
                  <input
                    type="text"
                    value={form.dv}
                    readOnly
                    className="input h-9 text-sm font-mono bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                    placeholder="—"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sección: Nombre */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Nombre
            </p>
            {isJuridica ? (
              <div>
                <label className="label">Razón Social</label>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => set('business_name', e.target.value)}
                  className="input h-9 text-sm"
                  placeholder="Empresa S.A.S"
                  required={isJuridica}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombres</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => set('first_name', e.target.value)}
                    className="input h-9 text-sm"
                    required={!isJuridica}
                  />
                </div>
                <div>
                  <label className="label">Apellidos</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => set('last_name', e.target.value)}
                    className="input h-9 text-sm"
                    required={!isJuridica}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sección: Clasificación */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Clasificación Tributaria
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="input h-9 text-sm"
                >
                  <option value="cliente">Cliente</option>
                  <option value="proveedor">Proveedor</option>
                  <option value="empleado">Empleado</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="label">Régimen</label>
                <select
                  value={form.tax_regime}
                  onChange={(e) => set('tax_regime', e.target.value)}
                  className="input h-9 text-sm"
                >
                  <option value="comun">Responsable de IVA</option>
                  <option value="simplificado">No Responsable de IVA</option>
                  <option value="no_aplica">No Aplica</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {[
                { key: 'withholding_agent', label: 'Agente Retenedor (Retefuente)' },
                { key: 'ica_withholding', label: 'Retención ICA' },
                { key: 'iva_withholding', label: 'Retención IVA' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sección: Contacto */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Contacto
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="input h-9 text-sm"
                  placeholder="correo@empresa.com"
                />
              </div>
              <div>
                <label className="label">Email Facturación Electrónica</label>
                <input
                  type="email"
                  value={form.email_fe}
                  onChange={(e) => set('email_fe', e.target.value)}
                  className="input h-9 text-sm"
                  placeholder="fe@empresa.com"
                />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className="input h-9 text-sm"
                />
              </div>
              <div>
                <label className="label">Ciudad</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  className="input h-9 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Dirección</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  className="input h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Tercero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
