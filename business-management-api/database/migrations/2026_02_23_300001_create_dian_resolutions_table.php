<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 4 — Resoluciones de numeración DIAN.
 *
 * Cada empresa debe tener al menos una resolución autorizada por la DIAN para
 * poder emitir facturas electrónicas. La resolución define el rango de números
 * habilitados y el prefijo.
 *
 * Una misma empresa puede tener varias resoluciones (facturas, notas débito,
 * notas crédito) y también resoluciones activas e inactivas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dian_resolutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');

            // Identificación de la resolución
            $table->string('resolution_number', 50);   // Ej: "18760000001"
            $table->date('resolution_date');            // Fecha en que la DIAN la emitió
            $table->string('prefix', 10)->nullable();  // SETP, FE, FA, NC, ND...
            $table->string('type', 30)->default('factura_venta'); // factura_venta|nota_credito|nota_debito

            // Rango de numeración autorizado
            $table->unsignedInteger('from_number');    // Primer número habilitado
            $table->unsignedInteger('to_number');      // Último número habilitado
            $table->unsignedInteger('current_number'); // Último consecutivo emitido

            // Vigencia
            $table->date('valid_from');                // Inicio de vigencia
            $table->date('valid_to');                  // Fin de vigencia
            $table->boolean('is_active')->default(true);

            // Clave técnica DIAN (diferente a la clave del software)
            $table->string('technical_key', 200)->nullable();

            // Ambiente (puede diferir del ambiente de la empresa)
            $table->string('environment', 20)->default('habilitacion'); // habilitacion|produccion

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'type', 'is_active']);
            $table->index(['company_id', 'prefix']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dian_resolutions');
    }
};
