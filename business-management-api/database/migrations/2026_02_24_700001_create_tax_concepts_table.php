<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_concepts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 10);
            $table->string('name', 150);
            $table->enum('type', ['retefuente', 'reteica', 'iva', 'reteiva', 'ica'])
                  ->comment('Tipo de impuesto');
            $table->decimal('rate', 8, 4)->comment('Porcentaje. Ej: 11.0000 = 11%');
            $table->decimal('minimum_base', 15, 2)->default(0)
                  ->comment('Base mínima gravable en pesos (calculada desde UVT)');
            $table->enum('applies_to', ['purchase', 'sale', 'both'])->default('purchase')
                  ->comment('purchase=compras | sale=ventas | both=ambos');
            $table->string('account_code', 20)->nullable()->comment('Código PUC asociado');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_concepts');
    }
};
