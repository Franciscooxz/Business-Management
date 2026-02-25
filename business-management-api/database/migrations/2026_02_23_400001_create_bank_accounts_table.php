<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Identificación
            $table->string('name', 100);                // "Bancolombia Corriente"
            $table->string('account_number', 50)->nullable();
            $table->enum('type', ['corriente', 'ahorros', 'caja_menor', 'fondo_fijo', 'tarjeta_credito']);
            $table->string('bank_name', 100)->nullable(); // Bancolombia, Davivienda...
            $table->string('currency', 3)->default('COP');

            // Saldo
            $table->decimal('initial_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->date('initial_balance_date')->nullable();

            // Vinculación contable (cuenta del PUC)
            $table->foreignId('puc_account_id')->nullable()->constrained('puc_accounts')->nullOnDelete();

            // Estado
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
