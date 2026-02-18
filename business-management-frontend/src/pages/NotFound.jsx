import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-400 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Página no encontrada
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Lo sentimos, la página que buscas no existe.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}