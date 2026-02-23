<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 3 — Agrega campos de costeo e inventario avanzado a la tabla products.
 *
 * costing_method : método de valoración de inventario (promedio_ponderado / peps / ueps)
 * avg_cost       : costo unitario promedio actualizado con cada movimiento
 * min_stock      : nivel de stock mínimo para alertas
 * max_stock      : nivel de stock máximo (para punto de reorden)
 * sku            : código de referencia interno
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Método de costeo — promedio ponderado es el más usado en Colombia
            $table->enum('costing_method', ['promedio_ponderado', 'peps', 'ueps'])
                  ->default('promedio_ponderado')
                  ->after('stock');

            // Costo unitario promedio actual (se recalcula con cada movimiento)
            $table->decimal('avg_cost', 14, 4)->default(0)->after('costing_method');

            // Niveles de stock para alertas
            $table->integer('min_stock')->default(0)->after('avg_cost');
            $table->integer('max_stock')->nullable()->after('min_stock');

            // SKU (referencia interna)
            $table->string('sku', 100)->nullable()->after('name');

            // Unidad de medida (UND, KG, LT, MTS, etc.)
            $table->string('unit_of_measure', 20)->default('UND')->after('sku');

            // Índices
            $table->index('sku');
            $table->index('min_stock');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['sku']);
            $table->dropIndex(['min_stock']);
            $table->dropColumn([
                'costing_method', 'avg_cost', 'min_stock', 'max_stock',
                'sku', 'unit_of_measure',
            ]);
        });
    }
};
