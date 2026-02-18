import * as XLSX from 'xlsx';

/**
 * Exporta datos a un archivo Excel
 * @param {Array} data - Array de objetos con los datos
 * @param {String} fileName - Nombre del archivo (sin extensión)
 * @param {String} sheetName - Nombre de la hoja
 */
export const exportToExcel = (data, fileName = 'export', sheetName = 'Sheet1') => {
  try {
    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Descargar archivo
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    return false;
  }
};

/**
 * Exporta múltiples hojas en un solo archivo Excel
 * @param {Array} sheets - Array de objetos { name, data }
 * @param {String} fileName - Nombre del archivo
 */
export const exportMultipleSheets = (sheets, fileName = 'export') => {
  try {
    const wb = XLSX.utils.book_new();
    
    sheets.forEach(sheet => {
      const ws = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });
    
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error al exportar múltiples hojas:', error);
    return false;
  }
};

/**
 * Formatea datos de productos para Excel
 */
export const formatProductsForExcel = (products) => {
  return products.map(product => ({
    'ID': product.id,
    'Nombre': product.name,
    'SKU': product.sku || 'N/A',
    'Categoría': product.category?.name || 'Sin categoría',
    'Precio': parseFloat(product.price).toFixed(2),
    'Stock': product.stock,
    'Stock Mínimo': product.min_stock || 0,
    'Estado': product.stock <= (product.min_stock || 5) ? 'STOCK BAJO' : 'OK',
    'Descripción': product.description || '',
  }));
};

/**
 * Formatea datos de ventas para Excel
 */
export const formatSalesForExcel = (sales) => {
  return sales.map(sale => ({
    'ID': sale.id,
    'Cliente': sale.customer_name,
    'Email': sale.customer_email || 'N/A',
    'Teléfono': sale.customer_phone || 'N/A',
    'Vendedor': sale.user?.name || 'N/A',
    'Total': parseFloat(sale.total).toFixed(2),
    'Descuento': parseFloat(sale.discount || 0).toFixed(2),
    'Subtotal': parseFloat(sale.subtotal).toFixed(2),
    'Impuesto': parseFloat(sale.tax || 0).toFixed(2),
    'Método de Pago': sale.payment_method,
    'Estado': sale.status,
    'Fecha': new Date(sale.created_at).toLocaleDateString('es-ES'),
    'Hora': new Date(sale.created_at).toLocaleTimeString('es-ES'),
  }));
};

/**
 * Formatea datos de clientes para Excel
 */
export const formatCustomersForExcel = (customers) => {
  return customers.map(customer => ({
    'ID': customer.id,
    'Nombre': customer.name,
    'Email': customer.email || 'N/A',
    'Teléfono': customer.phone || 'N/A',
    'Dirección': customer.address || 'N/A',
    'Fecha de Registro': new Date(customer.created_at).toLocaleDateString('es-ES'),
  }));
};

/**
 * Formatea datos de proveedores para Excel
 */
export const formatSuppliersForExcel = (suppliers) => {
  return suppliers.map(supplier => ({
    'ID': supplier.id,
    'Nombre': supplier.name,
    'Email': supplier.email || 'N/A',
    'Teléfono': supplier.phone || 'N/A',
    'Dirección': supplier.address || 'N/A',
    'Estado': supplier.is_active ? 'Activo' : 'Inactivo',
  }));
};

/**
 * Formatea datos de categorías para Excel
 */
export const formatCategoriesForExcel = (categories) => {
  return categories.map(category => ({
    'ID': category.id,
    'Nombre': category.name,
    'Descripción': category.description || 'N/A',
    'Cantidad de Productos': category.products_count || 0,
  }));
};

/**
 * Genera reporte de inventario con alertas
 */
export const generateInventoryReport = (products) => {
  const normalStock = products.filter(p => p.stock > (p.min_stock || 5));
  const lowStock = products.filter(p => p.stock <= (p.min_stock || 5) && p.stock > 0);
  const outOfStock = products.filter(p => p.stock === 0);
  
  return {
    sheets: [
      {
        name: 'Inventario Completo',
        data: formatProductsForExcel(products)
      },
      {
        name: 'Stock Bajo',
        data: formatProductsForExcel(lowStock)
      },
      {
        name: 'Sin Stock',
        data: formatProductsForExcel(outOfStock)
      },
      {
        name: 'Resumen',
        data: [
          { 'Categoría': 'Total de Productos', 'Cantidad': products.length },
          { 'Categoría': 'Stock Normal', 'Cantidad': normalStock.length },
          { 'Categoría': 'Stock Bajo', 'Cantidad': lowStock.length },
          { 'Categoría': 'Sin Stock', 'Cantidad': outOfStock.length },
          { 'Categoría': 'Valor Total Inventario', 'Cantidad': `$${products.reduce((sum, p) => sum + (p.price * p.stock), 0).toFixed(2)}` },
        ]
      }
    ],
    fileName: `Inventario-${new Date().toISOString().split('T')[0]}`
  };
};

/**
 * Lee un archivo Excel y retorna los datos como array de objetos
 * @param {File} file - Archivo Excel
 * @returns {Promise} Array de objetos con los datos
 */
export const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Leer primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Genera un template de Excel para importar productos
 */
export const generateProductsTemplate = () => {
  const template = [
    {
      'Nombre': 'Ejemplo Producto 1',
      'SKU': 'PROD-001',
      'Descripción': 'Descripción del producto',
      'Precio': 99.99,
      'Stock': 50,
      'Stock Mínimo': 5,
      'Categoría': 'Electrónica',
    },
    {
      'Nombre': 'Ejemplo Producto 2',
      'SKU': 'PROD-002',
      'Descripción': 'Otro producto de ejemplo',
      'Precio': 149.99,
      'Stock': 30,
      'Stock Mínimo': 10,
      'Categoría': 'Accesorios',
    },
  ];
  
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  
  XLSX.writeFile(wb, 'Template-Productos.xlsx');
  return true;
};

/**
 * Valida los datos de productos importados
 * @param {Array} data - Datos del Excel
 * @param {Array} categories - Categorías disponibles
 * @returns {Object} { valid, invalid, errors }
 */
export const validateProductsImport = (data, categories) => {
  const valid = [];
  const invalid = [];
  const errors = [];
  
  data.forEach((row, index) => {
    const rowErrors = [];
    const rowNumber = index + 2; // +2 porque Excel empieza en 1 y tiene header
    
    // Validar nombre (requerido)
    if (!row['Nombre'] || row['Nombre'].toString().trim() === '') {
      rowErrors.push(`Fila ${rowNumber}: El nombre es requerido`);
    }
    
    // Validar precio (requerido, positivo)
    if (!row['Precio'] || isNaN(row['Precio']) || parseFloat(row['Precio']) <= 0) {
      rowErrors.push(`Fila ${rowNumber}: El precio debe ser un número positivo`);
    }
    
    // Validar stock (requerido, no negativo)
    if (row['Stock'] === undefined || isNaN(row['Stock']) || parseInt(row['Stock']) < 0) {
      rowErrors.push(`Fila ${rowNumber}: El stock debe ser un número no negativo`);
    }
    
    // Validar categoría (debe existir)
    if (row['Categoría']) {
      const categoryExists = categories.some(
        cat => cat.name.toLowerCase() === row['Categoría'].toString().toLowerCase()
      );
      if (!categoryExists) {
        rowErrors.push(`Fila ${rowNumber}: La categoría "${row['Categoría']}" no existe`);
      }
    }
    
    if (rowErrors.length > 0) {
      invalid.push({ row: rowNumber, data: row, errors: rowErrors });
      errors.push(...rowErrors);
    } else {
      valid.push(row);
    }
  });
  
  return { valid, invalid, errors };
};

/**
 * Formatea datos del Excel al formato de la API
 * @param {Array} data - Datos validados
 * @param {Array} categories - Categorías disponibles
 * @returns {Array} Productos formateados para la API
 */
export const formatImportedProducts = (data, categories) => {
  return data.map(row => {
    const category = categories.find(
      cat => cat.name.toLowerCase() === (row['Categoría'] || '').toString().toLowerCase()
    );
    
    return {
      name: row['Nombre'].toString().trim(),
      sku: row['SKU'] ? row['SKU'].toString().trim() : null,
      description: row['Descripción'] ? row['Descripción'].toString().trim() : '',
      price: parseFloat(row['Precio']),
      stock: parseInt(row['Stock']),
      min_stock: row['Stock Mínimo'] ? parseInt(row['Stock Mínimo']) : 5,
      category_id: category ? category.id : null,
    };
  });
};