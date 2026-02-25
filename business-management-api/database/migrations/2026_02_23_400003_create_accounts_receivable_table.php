<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Cuentas por Cobrar ────────────────────────────────────────────────
        Schema::create('accounts_receivable', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Documento origen
            $table->foreignId('invoice_id')->nullable()
                  ->constrained('electronic_invoices')->nullOnDelete();
            $table->foreignId('third_party_id')->constrained('third_parties')->restrictOnDelete();

            // Referencia
            $table->string('document_number', 50)->nullable(); // Número factura
            $table->date('issue_date');
            $table->date('due_date');

            // Valores
            $table->decimal('total_amount', 15, 2);    // Valor original
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('pending_amount', 15, 2);  // total - paid

            // Estado: pendiente / parcial / pagado / vencido / anulado
            $table->enum('status', ['pendiente', 'parcial', 'pagado', 'vencido', 'anulado'])
                  ->default('pendiente');

            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'due_date']);
            $table->index(['third_party_id']);
        });

        // ── Pagos recibidos contra facturas ──────────────────────────────────
        Schema::create('ar_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('accounts_receivable_id')
                  ->constrained('accounts_receivable')->cascadeOnDelete();
            $table->foreignId('treasury_movement_id')
                  ->constrained()->cascadeOnDelete();

            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->string('notes', 300)->nullable();
            $table->timestamps();
        });

        // ── Cuentas por Pagar ─────────────────────────────────────────────────
        Schema::create('accounts_payable', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Documento origen
            $table->foreignId('purchase_order_id')->nullable()
                  ->constrained('purchase_orders')->nullOnDelete();
            $table->foreignId('third_party_id')->constrained('third_parties')->restrictOnDelete();

            // Referencia (factura del proveedor)
            $table->string('supplier_invoice', 100)->nullable();
            $table->date('issue_date');
            $table->date('due_date');

            // Valores
            $table->decimal('total_amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('pending_amount', 15, 2);

            $table->enum('status', ['pendiente', 'parcial', 'pagado', 'vencido', 'anulado'])
                  ->default('pendiente');

            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'due_date']);
        });

        // ── Pagos realizados a proveedores ───────────────────────────────────
        Schema::create('ap_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('accounts_payable_id')
                  ->constrained('accounts_payable')->cascadeOnDelete();
            $table->foreignId('treasury_movement_id')
                  ->constrained()->cascadeOnDelete();

            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->string('notes', 300)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ap_payments');
        Schema::dropIfExists('accounts_payable');
        Schema::dropIfExists('ar_payments');
        Schema::dropIfExists('accounts_receivable');
    }
};
