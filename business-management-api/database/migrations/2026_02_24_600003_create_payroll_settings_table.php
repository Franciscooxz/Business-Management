<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            $table->smallInteger('year');                        // Año de vigencia
            $table->decimal('smmlv', 15, 2);                    // Salario Mínimo Mensual
            $table->decimal('transport_allowance', 15, 2);      // Auxilio de transporte
            $table->boolean('is_active')->default(false);        // Solo 1 activo por empresa

            $table->timestamps();

            $table->unique(['company_id', 'year']);
            $table->index(['company_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_settings');
    }
};
