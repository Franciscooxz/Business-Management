<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->foreign('company_id')->references('id')->on('companies');

            $table->unsignedBigInteger('period_id');
            $table->foreign('period_id')->references('id')->on('accounting_periods');

            // ingreso, egreso, diario, ajuste, apertura, cierre, nota_debito, nota_credito
            $table->string('voucher_type', 20);
            $table->integer('consecutive');
            $table->string('prefix', 10)->nullable();
            $table->string('full_number', 30)->nullable(); // VI-0001

            $table->date('date');
            $table->text('description');

            $table->unsignedBigInteger('third_party_id')->nullable();
            $table->foreign('third_party_id')->references('id')->on('third_parties')->nullOnDelete();

            $table->unsignedBigInteger('cost_center_id')->nullable();
            $table->foreign('cost_center_id')->references('id')->on('cost_centers')->nullOnDelete();

            $table->unsignedBigInteger('currency_id')->nullable();
            $table->foreign('currency_id')->references('id')->on('currencies')->nullOnDelete();
            $table->decimal('exchange_rate', 18, 6)->default(1);

            // Enlace con documento origen
            $table->string('source_type', 50)->nullable(); // sale, purchase, payroll, manual
            $table->unsignedBigInteger('source_id')->nullable();

            // Totales (desnormalizados)
            $table->decimal('total_debit', 18, 4)->default(0);
            $table->decimal('total_credit', 18, 4)->default(0);

            // draft, posted, reversed
            $table->string('status', 20)->default('draft');

            $table->unsignedBigInteger('reversed_by')->nullable();
            $table->foreign('reversed_by')->references('id')->on('vouchers')->nullOnDelete();

            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by');
            $table->foreign('created_by')->references('id')->on('users');

            $table->unsignedBigInteger('posted_by')->nullable();
            $table->foreign('posted_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();

            $table->timestamps();

            $table->unique(['company_id', 'voucher_type', 'consecutive']);
            $table->index(['company_id', 'date']);
            $table->index(['company_id', 'status']);
            $table->index(['source_type', 'source_id']);
        });

        Schema::create('voucher_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('voucher_id');
            $table->foreign('voucher_id')->references('id')->on('vouchers')->cascadeOnDelete();

            $table->smallInteger('line_number');

            $table->unsignedBigInteger('account_id');
            $table->foreign('account_id')->references('id')->on('puc_accounts');

            $table->unsignedBigInteger('third_party_id')->nullable();
            $table->foreign('third_party_id')->references('id')->on('third_parties')->nullOnDelete();

            $table->unsignedBigInteger('cost_center_id')->nullable();
            $table->foreign('cost_center_id')->references('id')->on('cost_centers')->nullOnDelete();

            $table->text('description')->nullable();

            $table->decimal('debit', 18, 4)->default(0);
            $table->decimal('credit', 18, 4)->default(0);

            // Para lineas de impuestos
            $table->decimal('tax_base', 18, 4)->nullable();
            $table->decimal('tax_rate', 5, 4)->nullable();
            $table->string('tax_type', 30)->nullable(); // iva, retefuente, reteica, reteiva

            $table->timestamps();

            $table->index('voucher_id');
            $table->index('account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_lines');
        Schema::dropIfExists('vouchers');
    }
};
