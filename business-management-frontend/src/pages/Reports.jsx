import { useState, useEffect } from 'react';
import { Download, Package, TrendingDown } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccess, showError } from '../utils/toast';

export default function ReportsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', { params: { per_page: 1000 } });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const generateInventoryReport = () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE INVENTARIO', 15, 20);
      
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 15, 28);
      
      // Estadísticas
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(10);
      
      const totalProducts = products.length;
      const lowStock = products.filter(p => p.stock <= 5).length;
      const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
      
      let yPos = 45;
      doc.text(`Total de Productos: ${totalProducts}`, 15, yPos);
      doc.text(`Productos con Stock Bajo: ${lowStock}`, 15, yPos + 6);
      doc.text(`Valor Total del Inventario: $${totalValue.toFixed(2)}`, 15, yPos + 12);
      
      // Tabla
      const tableData = products.map(p => [
        p.name,
        p.category?.name || 'Sin categoría',
        p.stock.toString(),
        `${p.currency?.symbol || '$'}${parseFloat(p.price).toFixed(2)}`,
        `${p.currency?.symbol || '$'}${(p.price * p.stock).toFixed(2)}`,
        p.stock <= 5 ? '⚠️ Bajo' : '✓'
      ]);
      
      autoTable(doc, { // 👈 USAR autoTable DIRECTAMENTE
        startY: yPos + 20,
        head: [['Producto', 'Categoría', 'Stock', 'Precio', 'Valor Total', 'Estado']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' },
        },
      });
      
      // Productos con stock bajo
      const lowStockProducts = products.filter(p => p.stock <= 5);
      if (lowStockProducts.length > 0) {
        const finalY = doc.lastAutoTable.finalY + 15;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68);
        doc.text('⚠️ ALERTA: PRODUCTOS CON STOCK BAJO', 15, finalY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        
        lowStockProducts.forEach((p, index) => {
          doc.text(`• ${p.name} - Stock: ${p.stock}`, 15, finalY + 8 + (index * 5));
        });
      }
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFillColor(243, 244, 246);
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.text('Business Manager - Sistema de Gestión', pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.text('Documento generado electrónicamente', pageWidth / 2, pageHeight - 8, { align: 'center' });
      
      // Descargar
      doc.save(`Inventario-${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccess('Reporte generado correctamente');
    } catch (error) {
      console.error('Error al generar reporte:', error);
      showError('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Genera reportes en PDF de tu negocio</p>
        </div>

        {/* Reportes disponibles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Reporte de Inventario */}
          <div className="card hover:shadow-strong transition-all duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Inventario</h3>
                <p className="text-sm text-gray-600">Lista completa de productos</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Productos:</span>
                <span className="font-semibold text-gray-900">{products.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Stock Bajo:</span>
                <span className="font-semibold text-red-600">
                  {products.filter(p => p.stock <= 5).length}
                </span>
              </div>
            </div>
            
            <button
              onClick={generateInventoryReport}
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generando...
                </span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generar PDF
                </>
              )}
            </button>
          </div>

          {/* Más reportes - Placeholder */}
          <div className="card border-2 border-dashed border-gray-300 opacity-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-500">Ventas</h3>
                <p className="text-sm text-gray-400">Próximamente</p>
              </div>
            </div>
          </div>

          <div className="card border-2 border-dashed border-gray-300 opacity-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-500">Compras</h3>
                <p className="text-sm text-gray-400">Próximamente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutNew>
  );
}