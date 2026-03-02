import { Layers, AlertCircle } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';

const mockCenters = [
  { id: 1, code: 'CC-001', name: 'Administración',  type: 'Gasto',    active: true },
  { id: 2, code: 'CC-002', name: 'Ventas',          type: 'Gasto',    active: true },
  { id: 3, code: 'CC-003', name: 'Producción',      type: 'Costo',    active: true },
  { id: 4, code: 'CC-004', name: 'Investigación',   type: 'Inversión',active: false },
];

export default function CostCenters() {
  return (
    <LayoutNew>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centros de Costo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define y gestiona los centros de costo de tu empresa
          </p>
        </div>
      </div>

      {/* Aviso módulo en desarrollo */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Módulo en desarrollo</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            La gestión completa de centros de costo estará disponible próximamente.
            A continuación se muestra una vista preliminar.
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Centros registrados
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Código</th>
              <th className="px-6 py-3 text-left">Nombre</th>
              <th className="px-6 py-3 text-left">Tipo</th>
              <th className="px-6 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {mockCenters.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{c.code}</td>
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{c.type}</td>
                <td className="px-6 py-3">
                  {c.active ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Inactivo
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </LayoutNew>
  );
}
