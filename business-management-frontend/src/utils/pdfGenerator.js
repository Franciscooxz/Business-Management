import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Configuración de la empresa (puedes moverlo a un archivo de config)
const COMPANY_INFO = {
  name: 'Business Manager',
  address: 'Calle 123 #45-67, Cartagena',
  city: 'Cartagena, Bolívar',
  country: 'Colombia',
  phone: '+57 300 123 4567',
  email: 'contacto@businessmanager.com',
  website: 'www.businessmanager.com',
  taxId: 'NIT: 900.123.456-7',
};

// Colores corporativos
const COLORS = {
  primary: [59, 130, 246], // Blue
  secondary: [107, 114, 128], // Gray
  success: [16, 185, 129], // Green
  text: [31, 41, 55], // Dark gray
  light: [243, 244, 246], // Light gray
};

/**
 * Generar factura de venta
 */
export const generateSaleInvoice = (sale) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Logo/Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('FACTURA DE VENTA', 15, 30);
  
  // Número de factura
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${sale.id.toString().padStart(6, '0')}`, pageWidth - 15, 25, { align: 'right' });
  
  // Información de la empresa
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let yPos = 50;
  
  doc.text(COMPANY_INFO.address, 15, yPos);
  doc.text(COMPANY_INFO.city, 15, yPos + 5);
  doc.text(`Tel: ${COMPANY_INFO.phone}`, 15, yPos + 10);
  doc.text(COMPANY_INFO.email, 15, yPos + 15);
  doc.text(COMPANY_INFO.taxId, 15, yPos + 20);
  
  // Información del cliente
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', pageWidth - 80, yPos);
  doc.setFont('helvetica', 'normal');
  
  const customerName = sale.customer?.name || sale.customer_name || 'Cliente General';
  const customerEmail = sale.customer?.email || sale.customer_email || '';
  const customerPhone = sale.customer?.phone || sale.customer_phone || '';
  
  doc.text(customerName, pageWidth - 80, yPos + 5);
  if (customerEmail) doc.text(customerEmail, pageWidth - 80, yPos + 10);
  if (customerPhone) doc.text(customerPhone, pageWidth - 80, yPos + 15);
  
  // Fecha
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', pageWidth - 80, yPos + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(sale.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }), pageWidth - 80, yPos + 30);
  
  // Tabla de productos
  yPos += 45;
  
  const tableData = sale.items.map(item => [
    item.product?.name || 'Producto',
    item.quantity.toString(),
    `${sale.currency?.symbol || '$'}${parseFloat(item.price).toFixed(2)}`,
    `${sale.currency?.symbol || '$'}${(item.quantity * item.price).toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: yPos,
    head: [['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 15, right: 15 },
  });
  
  // Totales
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 80;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Subtotal
  doc.text('Subtotal:', totalsX, finalY);
  doc.text(`${sale.currency?.symbol || '$'}${parseFloat(sale.subtotal).toFixed(2)}`, 
    pageWidth - 15, finalY, { align: 'right' });
  
  // Descuento
  if (parseFloat(sale.discount) > 0) {
    doc.text('Descuento:', totalsX, finalY + 6);
    doc.text(`-${sale.currency?.symbol || '$'}${parseFloat(sale.discount).toFixed(2)}`, 
      pageWidth - 15, finalY + 6, { align: 'right' });
  }
  
  // Impuestos
  doc.text('Impuestos:', totalsX, finalY + 12);
  doc.text(`${sale.currency?.symbol || '$'}${parseFloat(sale.tax).toFixed(2)}`, 
    pageWidth - 15, finalY + 12, { align: 'right' });
  
  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setFillColor(...COLORS.light);
  doc.rect(totalsX - 5, finalY + 18, pageWidth - totalsX - 10, 10, 'F');
  
  doc.text('TOTAL:', totalsX, finalY + 25);
  doc.setTextColor(...COLORS.primary);
  doc.text(`${sale.currency?.symbol || '$'}${parseFloat(sale.total).toFixed(2)}`, 
    pageWidth - 15, finalY + 25, { align: 'right' });
  
  // Método de pago
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Método de pago: ${sale.payment_method || 'Efectivo'}`, 15, finalY + 25);
  
  // Moneda
  if (sale.currency) {
    doc.text(`Moneda: ${sale.currency.code} (${sale.currency.name})`, 15, finalY + 30);
  }
  
  // Notas
  if (sale.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notas:', 15, finalY + 40);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.notes, 15, finalY + 45, { maxWidth: pageWidth - 30 });
  }
  
  // Footer
  doc.setFillColor(...COLORS.light);
  doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
  
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(8);
  doc.text('Gracias por su compra', pageWidth / 2, pageHeight - 20, { align: 'center' });
  doc.text(COMPANY_INFO.website, pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text('Este es un documento generado electrónicamente', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  // Marca de agua
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(50);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45,
    opacity: 0.1
  });
  
  return doc;
};

/**
 * Generar orden de compra PDF
 */
export const generatePurchaseOrderPDF = (order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 15, 20);
  
  doc.setFontSize(10);
  doc.text('ORDEN DE COMPRA', 15, 30);
  
  // Número de orden
  doc.setFontSize(16);
  doc.text(order.order_number, pageWidth - 15, 25, { align: 'right' });
  
  // Información
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let yPos = 50;
  
  // Nuestra información
  doc.text(COMPANY_INFO.address, 15, yPos);
  doc.text(COMPANY_INFO.phone, 15, yPos + 5);
  doc.text(COMPANY_INFO.email, 15, yPos + 10);
  
  // Información del proveedor
  doc.setFont('helvetica', 'bold');
  doc.text('PROVEEDOR:', pageWidth - 80, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(order.supplier.name, pageWidth - 80, yPos + 5);
  if (order.supplier.email) doc.text(order.supplier.email, pageWidth - 80, yPos + 10);
  if (order.supplier.phone) doc.text(order.supplier.phone, pageWidth - 80, yPos + 15);
  
  // Fechas
  yPos += 30;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha Orden:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(order.order_date).toLocaleDateString('es-ES'), 60, yPos);
  
  if (order.expected_delivery_date) {
    doc.setFont('helvetica', 'bold');
    doc.text('Entrega Esperada:', 15, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(order.expected_delivery_date).toLocaleDateString('es-ES'), 60, yPos + 5);
  }
  
  // Estado
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', pageWidth - 80, yPos);
  doc.setFont('helvetica', 'normal');
  
  const statusLabels = {
    pending: 'Pendiente',
    partial: 'Parcial',
    received: 'Recibida',
    cancelled: 'Cancelada'
  };
  doc.text(statusLabels[order.status] || order.status, pageWidth - 50, yPos);
  
  // Tabla de productos
  yPos += 15;
  
  const tableData = order.items.map(item => [
    item.product?.name || 'Producto',
    item.quantity_ordered.toString(),
    item.quantity_received.toString(),
    `${order.currency?.symbol || '$'}${parseFloat(item.unit_cost).toFixed(2)}`,
    `${order.currency?.symbol || '$'}${parseFloat(item.subtotal).toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: yPos,
    head: [['Producto', 'Ordenado', 'Recibido', 'Costo Unit.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
    },
  });
  
  // Totales
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 70;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  doc.text('Subtotal:', totalsX, finalY);
  doc.text(`${order.currency?.symbol || '$'}${parseFloat(order.subtotal).toFixed(2)}`, 
    pageWidth - 15, finalY, { align: 'right' });
  
  if (parseFloat(order.tax) > 0) {
    doc.text('Impuestos:', totalsX, finalY + 6);
    doc.text(`${order.currency?.symbol || '$'}${parseFloat(order.tax).toFixed(2)}`, 
      pageWidth - 15, finalY + 6, { align: 'right' });
  }
  
  if (parseFloat(order.shipping) > 0) {
    doc.text('Envío:', totalsX, finalY + 12);
    doc.text(`${order.currency?.symbol || '$'}${parseFloat(order.shipping).toFixed(2)}`, 
      pageWidth - 15, finalY + 12, { align: 'right' });
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, finalY + 20);
  doc.setTextColor(...COLORS.primary);
  doc.text(`${order.currency?.symbol || '$'}${parseFloat(order.total).toFixed(2)}`, 
    pageWidth - 15, finalY + 20, { align: 'right' });
  
  // Notas
  if (order.notes) {
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Notas:', 15, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(order.notes, 15, finalY + 35, { maxWidth: pageWidth - 30 });
  }
  
  // Footer
  doc.setFillColor(...COLORS.light);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(8);
  doc.text(COMPANY_INFO.website, pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text('Documento generado electrónicamente', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  return doc;
};

/**
 * Descargar PDF
 */
export const downloadPDF = (doc, filename) => {
  doc.save(filename);
};

/**
 * Previsualizar PDF
 */
export const previewPDF = (doc) => {
  window.open(doc.output('bloburl'), '_blank');
};