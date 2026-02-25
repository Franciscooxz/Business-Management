import { Building2, MapPin, Phone, Mail, FileText, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function CompanySettings() {
  const user = useAuthStore((state) => state.user);
  const company = user?.company;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empresa</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Información y configuración de tu empresa
        </p>
      </div>

      {/* Aviso módulo en desarrollo */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Módulo en desarrollo</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            La edición completa de la configuración empresarial estará disponible próximamente.
          </p>
        </div>
      </div>

      {/* Info actual */}
      {company && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{company.nombre_comercial ?? company.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{company.plan ?? 'Plan activo'}</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoField icon={FileText} label="NIT / RUT" value={company.nit ?? '—'} />
            <InfoField icon={Building2} label="Razón Social" value={company.razon_social ?? company.name ?? '—'} />
            <InfoField icon={MapPin}   label="Dirección"   value={company.address ?? '—'} />
            <InfoField icon={Phone}    label="Teléfono"    value={company.phone ?? '—'} />
            <InfoField icon={Mail}     label="Email"       value={company.email ?? '—'} />
          </div>
        </div>
      )}

      {!company && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay información de empresa disponible.</p>
        </div>
      )}
    </div>
  );
}

function InfoField({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
