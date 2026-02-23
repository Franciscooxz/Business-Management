<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 3 — Enhances stock_movements to a full Kardex:
 *
 * unit_cost      : costo unitario del movimiento (precio de compra, costo promedio, etc.)
 * total_cost     : unit_cost × |quantity|
 * balance_qty    : saldo de unidades tras el movimiento
 * balance_value  : saldo valorado (balance_qty × avg_cost al momento del movimiento)
 * reference      : número de documento origen (PO-00001, F-000001, etc.)
 * source_type    : modelo origen del movimiento (PurchaseOrder, Sale, null)
 * source_id      : ID del modelo origen
 * company_id     : multi-tenancy (ya fue agregado por la migración global)
 *
 * Se amplía también el ENUM type para incluir los tipos colombianos:
 *   compra        — recepción de orden de compra
 *   venta         — despacho por venta
 *   devolucion_compra  — devolución a proveedor
 *   devolucion_venta   — devolución de cliente
 *   traslado      — traslado entre bodegas
 *   inicial       — inventario inicial (ya existe)
 *   entrada       — entrada manual (ya existe)
 *   salida        — salida manual (ya existe)
 *   ajuste        — ajuste de inventario (ya existe)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            // Kardex: costos
            $table->decimal('unit_cost', 14, 4)->default(0)->after('reason');
            $table->decimal('total_cost', 14, 4)->default(0)->after('unit_cost');

            // Kardex: saldos tras el movimiento
            $table->decimal('balance_qty', 14, 4)->default(0)->after('total_cost');
            $table->decimal('balance_value', 14, 4)->default(0)->after('balance_qty');

            // Referencia documental
            $table->string('reference', 100)->nullable()->after('balance_value');

            // Traceabilidad: origen del movimiento (polimórfico ligero)
            $table->string('source_type', 50)->nullable()->after('reference');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');

            // Nota ampliada
            $table->text('notes')->nullable()->after('source_id');

            // Índices nuevos
            $table->index(['source_type', 'source_id']);
            $table->index('reference');
        });

        // Ampliar ENUM type — en SQLite no hay ALTER ENUM, se hace con una nueva columna temporal
        // En PostgreSQL y MySQL sí se puede, pero para compatibilidad cruzada usamos string
        // La validación del enum se hace a nivel de aplicación (Laravel Rule::in)
        // Solo cambiamos el tipo de columna si el motor lo permite
        try {
            Schema::table('stock_movements', function (Blueprint $table) {
                $table->string('type', 40)->default('ajuste')->change();
            });
        } catch (\Exception $e) {
            // SQLite no soporta CHANGE — se omite, los nuevos tipos se validan en app
        }
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex(['source_type', 'source_id']);
            $table->dropIndex(['reference']);
            $table->dropColumn([
                'unit_cost', 'total_cost', 'balance_qty', 'balance_value',
                'reference', 'source_type', 'source_id', 'notes',
            ]);
        });
    }
};
