import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary
 *
 * Captura errores de renderizado en cualquier componente hijo.
 * Muestra un mensaje amigable en lugar de romper toda la UI.
 *
 * Uso básico:
 *   <ErrorBoundary>
 *     <MiComponente />
 *   </ErrorBoundary>
 *
 * Uso con mensaje personalizado:
 *   <ErrorBoundary fallbackMessage="Error al cargar el módulo de reportes.">
 *     <Reportes />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:  false,
      error:     null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallbackMessage, showDetails = false } = this.props;

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        {/* Icono */}
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-amber-500 dark:text-amber-400" />
        </div>

        {/* Título */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
          Algo salió mal
        </h2>

        {/* Mensaje */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
          {fallbackMessage ??
            'Este módulo encontró un error inesperado. Puedes intentar recargarlo o volver al panel principal.'}
        </p>

        {/* Detalle técnico (solo en desarrollo o si se pide explícitamente) */}
        {(showDetails || import.meta.env.DEV) && this.state.error && (
          <details className="mb-5 w-full max-w-lg">
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 select-none">
              Ver detalles técnicos
            </summary>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto max-h-40">
              <p className="text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
                {this.state.error.toString()}
              </p>
              {this.state.errorInfo && (
                <p className="text-xs text-gray-400 font-mono whitespace-pre-wrap mt-2">
                  {this.state.errorInfo.componentStack}
                </p>
              )}
            </div>
          </details>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <button
            onClick={this.handleGoHome}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Panel principal
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
