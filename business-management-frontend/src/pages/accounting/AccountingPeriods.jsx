import { CalendarDays, Lock, Unlock, AlertCircle } from 'lucide-react';

const mockPeriods = [
  { id: 1, name: 'Enero 2026',    start: '2026-01-01', end: '2026-01-31', status: 'open' },
  { id: 2, name: 'Febrero 2026',  start: '2026-02-01', end: '2026-02-28', status: 'open' },
  { id: 3, name: 'Diciembre 2025',start: '2025-12-01', end: '2025-12-31', status: 'closed' },
  { id: 4, name: 'Noviembre 2025',start: '2025-11-01', end: '2025-11-30', status: 'closed' },
];

export default function AccountingPeriods() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Periodos Contables</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona la apertura y cierre de periodos contables
          </p>
        </div>
      </div>

      {/* Aviso módulo en desarrollo */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Módulo en desarrollo</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            La gestión completa de periodos contables estará disponible próximamente.
            A continuación se muestra una vista preliminar.
          </p>
        </div>
      </div>

      {/* Tabla de periodos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Periodos registrados
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Periodo</th>
              <th className="px-6 py-3 text-left">Inicio</th>
              <th className="px-6 py-3 text-left">Fin</th>
              <th className="px-6 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {mockPeriods.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{p.start}</td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{p.end}</td>
                <td className="px-6 py-3">
                  {p.status === 'open' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      <Unlock className="w-3 h-3" /> Abierto
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      <Lock className="w-3 h-3" /> Cerrado
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
