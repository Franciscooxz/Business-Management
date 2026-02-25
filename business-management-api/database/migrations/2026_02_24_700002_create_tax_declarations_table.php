<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_declarations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');

            // Clasificación
            $table->enum('type', ['iva', 'retefuente', 'reteica', 'ica', 'renta']);
            $table->enum('period_type', ['mensual', 'bimestral', 'cuatrimestral', 'anual']);
            $table->smallInteger('year');
            $table->tinyInteger('period_number')->comment('1-12 mensual | 1-6 bimestral | 1-3 cuatrimestral | 1 anual');
            $table->date('start_date');
            $table->date('end_date');

            // Totales calculados
            $table->decimal('total_base',             15, 2)->default(0);
            $table->decimal('total_tax_generated',    15, 2)->default(0)->comment('IVA generado / retefuente practicada');
            $table->decimal('total_tax_discountable', 15, 2)->default(0)->comment('IVA descontable');
            $table->decimal('previous_balance_favor', 15, 2)->default(0)->comment('Saldo a favor período anterior');
            $table->decimal('saldo_pagar',            15, 2)->default(0);
            $table->decimal('saldo_favor',            15, 2)->default(0);

            // Estado
            $table->enum('status', ['borrador', 'presentada', 'pagada'])->default('borrador');
            $table->text('notes')->nullable();
            $table->timestamp('presented_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'type', 'year', 'period_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_declarations');
    }
};
