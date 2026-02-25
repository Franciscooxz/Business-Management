<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('withholding_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tax_concept_id')->constrained('tax_concepts');
            $table->foreignId('tax_declaration_id')
                  ->nullable()
                  ->constrained('tax_declarations')
                  ->nullOnDelete();

            // Tercero (sin FK estricta para flexibilidad)
            $table->unsignedBigInteger('third_party_id')->nullable()->index();

            // Documento origen
            $table->string('document_number', 50)->nullable();
            $table->date('document_date');
            $table->string('reference', 100)->nullable()->comment('Ej: Factura 001-0001');

            // Valores
            $table->decimal('base_amount', 15, 2)->comment('Base gravable');
            $table->decimal('rate',        8,  4)->comment('Tasa snapshot al momento del registro');
            $table->decimal('tax_amount',  15, 2)->comment('Valor retenido = base * rate/100');

            // Dirección contable
            $table->enum('direction', ['practicada', 'sufrida'])
                  ->comment('practicada = nosotros retenemos a terceros | sufrida = nos retienen a nosotros');

            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withholding_entries');
    }
};
