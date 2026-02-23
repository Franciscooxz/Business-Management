<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 4 — Facturas electrónicas DIAN.
 *
 * Almacena el encabezado de cada documento electrónico emitido:
 *   - Factura de Venta (01)
 *   - Nota de Crédito (91)
 *   - Nota de Débito (92)
 *
 * El CUFE (Código Único de Factura Electrónica) es el hash SHA-384
 * calculado según el algoritmo de la DIAN y es el identificador único
 * ante el sistema tributario colombiano.
 *
 * status:
 *   draft      → Creada, sin firmar ni enviar
 *   signed     → XML generado y firmado con el certificado
 *   sent       → Enviada a la DIAN (o al proveedor tecnológico)
 *   accepted   → Aceptada por la DIAN (isValid=true)
 *   rejected   → Rechazada por la DIAN
 *   cancelled  → Anulada mediante nota de crédito
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('electronic_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('resolution_id')->constrained('dian_resolutions');

            // Tipo de documento
            $table->string('document_type', 10)->default('01');
            // 01=Factura venta, 91=Nota crédito, 92=Nota débito
            $table->string('document_type_name', 50)->default('Factura de Venta');

            // Numeración
            $table->string('prefix', 10)->nullable();
            $table->unsignedInteger('number');         // Consecutivo
            $table->string('full_number', 30);         // Ej: SETP990000001

            // Fecha y hora (requeridas por DIAN)
            $table->date('issue_date');
            $table->time('issue_time');

            // CUFE — identificador único DIAN (SHA-384)
            $table->string('cufe', 200)->nullable()->unique();

            // Comprador
            $table->foreignId('buyer_id')->nullable()->constrained('third_parties')->nullOnDelete();
            $table->string('buyer_name', 500)->nullable();        // Copia desnormalizada
            $table->string('buyer_document', 50)->nullable();
            $table->string('buyer_document_type', 10)->nullable(); // NIT, CC, etc.
            $table->string('buyer_email', 255)->nullable();
            $table->string('buyer_address', 500)->nullable();
            $table->string('buyer_city', 100)->nullable();
            $table->string('buyer_department', 100)->nullable();

            // Referencia (para notas crédito/débito)
            $table->foreignId('reference_invoice_id')->nullable()
                  ->constrained('electronic_invoices')->nullOnDelete();
            $table->string('correction_concept', 10)->nullable(); // Código DIAN corrección

            // Moneda
            $table->string('currency', 10)->default('COP');
            $table->decimal('exchange_rate', 14, 6)->default(1);

            // Valores (COP)
            $table->decimal('subtotal', 14, 2)->default(0);         // Base gravable
            $table->decimal('discount_total', 14, 2)->default(0);   // Total descuentos
            $table->decimal('tax_iva', 14, 2)->default(0);          // Impuesto IVA
            $table->decimal('tax_inc', 14, 2)->default(0);          // Imp. Nacional Consumo
            $table->decimal('tax_ica', 14, 2)->default(0);          // ICA
            $table->decimal('tax_retefuente', 14, 2)->default(0);   // Retención fuente
            $table->decimal('tax_reteiva', 14, 2)->default(0);      // Retención IVA
            $table->decimal('tax_reteica', 14, 2)->default(0);      // Retención ICA
            $table->decimal('total', 14, 2)->default(0);            // Total a pagar

            // Estado
            $table->string('status', 20)->default('draft');
            // draft|signed|sent|accepted|rejected|cancelled

            // Respuesta DIAN
            $table->string('dian_track_id', 200)->nullable();    // TrackId de la DIAN
            $table->boolean('dian_is_valid')->nullable();
            $table->string('dian_status_code', 20)->nullable();
            $table->text('dian_status_message')->nullable();
            $table->timestamp('dian_validated_at')->nullable();

            // Archivos generados
            $table->string('xml_path', 500)->nullable();         // Ruta del XML firmado
            $table->string('pdf_path', 500)->nullable();         // Ruta del PDF
            $table->text('xml_content')->nullable();             // XML completo (también en BD)

            // Integración contable
            $table->foreignId('voucher_id')->nullable()
                  ->constrained('vouchers')->nullOnDelete();

            $table->text('notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'issue_date']);
            $table->index('cufe');
            $table->index('full_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('electronic_invoices');
    }
};
