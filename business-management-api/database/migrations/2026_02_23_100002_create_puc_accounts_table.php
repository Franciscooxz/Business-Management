<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('puc_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->foreign('company_id')->references('id')->on('companies');

            $table->string('code', 20);
            $table->string('name');
            $table->text('description')->nullable();

            $table->unsignedBigInteger('parent_id')->nullable();
            $table->foreign('parent_id')->references('id')->on('puc_accounts')->nullOnDelete();

            // Nivel: 1=Clase, 2=Grupo, 3=Cuenta, 4=Subcuenta, 5=Auxiliar
            $table->smallInteger('level');

            // Tipo: activo, pasivo, patrimonio, ingreso, gasto, costo, orden
            $table->string('type', 20);

            // Naturaleza normal: debito, credito
            $table->string('nature', 10);

            // Solo nivel 5 (auxiliar) acepta movimientos directamente
            $table->boolean('allows_entries')->default(false);

            // Configuracion especial
            $table->boolean('requires_third')->default(false);    // Exige tercero
            $table->boolean('requires_cost_center')->default(false);
            $table->boolean('requires_document')->default(false);

            // Vinculacion tributaria
            $table->string('iva_tax_code', 10)->nullable();
            $table->decimal('rete_fuente_rate', 5, 4)->nullable();

            // Balance acumulado (desnormalizado para performance)
            $table->decimal('balance_debit', 18, 4)->default(0);
            $table->decimal('balance_credit', 18, 4)->default(0);

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'level']);
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('puc_accounts');
    }
};
