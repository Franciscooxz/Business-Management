<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Tipo y concepto
            $table->enum('type', [
                'ingreso',       // Cobro, consignación
                'egreso',        // Pago, retiro
                'traslado',      // Entre cuentas/cajas
            ]);
            $table->enum('concept', [
                'cobro_cliente',         // Pago de factura
                'anticipo_cliente',      // Anticipo recibido
                'pago_proveedor',        // Pago orden de compra
                'anticipo_proveedor',    // Anticipo a proveedor
                'pago_nomina',           // Nómina
                'pago_impuesto',         // DIAN, municipio
                'gasto_operativo',       // Servicios, arriendo
                'traslado_interno',      // Entre cuentas propias
                'consignacion',          // Consignación bancaria
                'otro_ingreso',
                'otro_egreso',
            ]);

            // Cuentas involucradas
            $table->foreignId('bank_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('destination_account_id')->nullable() // Solo para traslados
                  ->constrained('bank_accounts')->nullOnDelete();

            // Tercero (cliente/proveedor)
            $table->foreignId('third_party_id')->nullable()->constrained('third_parties')->nullOnDelete();

            // Referencia a documentos fuente
            $table->string('source_type', 50)->nullable(); // 'electronic_invoice', 'purchase_order', etc.
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('reference', 100)->nullable();  // Número cheque, transfer, etc.

            // Valores
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('COP');
            $table->decimal('exchange_rate', 10, 4)->default(1);

            // Retenciones aplicadas (solo en pagos/cobros)
            $table->decimal('retention_retefuente', 15, 2)->default(0);
            $table->decimal('retention_reteiva', 15, 2)->default(0);
            $table->decimal('retention_reteica', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2); // amount - retenciones

            // Fechas y descripción
            $table->date('movement_date');
            $table->string('description', 500)->nullable();

            // Estado
            $table->enum('status', ['pendiente', 'aplicado', 'anulado'])->default('aplicado');

            // Comprobante contable generado automáticamente
            $table->foreignId('voucher_id')->nullable()->constrained('vouchers')->nullOnDelete();

            // Conciliación bancaria
            $table->boolean('is_reconciled')->default(false);
            $table->date('reconciled_date')->nullable();
            $table->string('bank_reference', 100)->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'movement_date']);
            $table->index(['bank_account_id', 'is_reconciled']);
            $table->index(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_movements');
    }
};
