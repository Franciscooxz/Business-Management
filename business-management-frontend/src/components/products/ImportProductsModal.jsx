import { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { readExcelFile, validateProductsImport, formatImportedProducts, generateProductsTemplate } from '../../utils/excelExport';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../api/axios';

export default function ImportProductsModal({ categories, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validar extensión
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      showError('Formato no válido. Use Excel (.xlsx, .xls) o CSV');
      return;
    }

    setFile(selectedFile);
    setValidationResult(null);
    
    // Leer y validar archivo
    try {
      setLoading(true);
      const data = await readExcelFile(selectedFile);
      
      if (data.length === 0) {
        showError('El archivo está vacío');
        setFile(null);
        return;
      }
      
      const validation = validateProductsImport(data, categories);
      setValidationResult(validation);
      
      if (validation.valid.length > 0) {
        showSuccess(`${validation.valid.length} productos listos para importar`);
      }
      
      if (validation.invalid.length > 0) {
        showError(`${validation.invalid.length} productos con errores`);
      }
    } catch (error) {
      console.error('Error al leer archivo:', error);
      showError('Error al leer el archivo');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.valid.length === 0) {
      showError('No hay productos válidos para importar');
      return;
    }

    try {
      setImporting(true);
      
      const productsToImport = formatImportedProducts(validationResult.valid, categories);
      
      // Importar en lotes de 10
      const batchSize = 10;
      let imported = 0;
      let failed = 0;
      
      for (let i = 0; i < productsToImport.length; i += batchSize) {
        const batch = productsToImport.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(product => api.post('/products', product))
        );
        
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            imported++;
          } else {
            failed++;
          }
        });
      }
      
      if (imported > 0) {
        showSuccess(`${imported} productos importados correctamente`);
      }
      
      if (failed > 0) {
        showError(`${failed} productos fallaron al importar`);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al importar:', error);
      showError('Error al importar productos');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    generateProductsTemplate();
    showSuccess('Template descargado correctamente');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Productos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Carga productos masivamente desde Excel
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instrucciones */}
          <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-2">Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Descarga el template para ver el formato correcto</li>
                  <li>Las columnas requeridas son: Nombre, Precio, Stock</li>
                  <li>Las categorías deben existir previamente en el sistema</li>
                  <li>El SKU es opcional pero debe ser único si se proporciona</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Descargar Template */}
          <button
            onClick={handleDownloadTemplate}
            className="w-full btn bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800"
          >
            <Download className="w-4 h-4" />
            Descargar Template de Excel
          </button>

          {/* Upload Zone */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={loading || importing}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              {loading ? (
                <>
                  <Loader className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">
                    Procesando archivo...
                  </p>
                </>
              ) : file ? (
                <>
                  <FileSpreadsheet className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click para cambiar archivo
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    Click para subir archivo
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Formatos: Excel (.xlsx, .xls) o CSV
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Resultados de Validación */}
          {validationResult && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4">
                {validationResult.valid.length > 0 && (
                  <div className="card bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Válidos
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {validationResult.valid.length}
                    </p>
                  </div>
                )}
                
                {validationResult.invalid.length > 0 && (
                  <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-semibold text-red-900 dark:text-red-200">
                        Con Errores
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {validationResult.invalid.length}
                    </p>
                  </div>
                )}
              </div>

              {/* Lista de Errores */}
              {validationResult.errors.length > 0 && (
                <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 max-h-60 overflow-y-auto">
                  <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                    Errores Encontrados:
                  </h4>
                  <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!validationResult || validationResult.valid.length === 0 || importing}
            className="flex-1 btn btn-primary"
          >
            {importing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar {validationResult?.valid.length || 0} Productos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}