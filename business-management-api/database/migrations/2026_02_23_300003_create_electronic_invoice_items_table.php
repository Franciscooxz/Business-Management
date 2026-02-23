<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 4 — Líneas de detalle de la factura electrónica.
 *
 * Cada línea representa un producto o servicio facturado con su
 * descripción, cantidad, precio unitario y tributos aplicables.
 *
 * Los tributos principales en Colombia son:
 *   01 - IVA   (0%, 5%, 19%)
 *   04 - INC   (Impuesto Nacional al Consumo)
 *   ZY - No aplica (servicios exentos)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('electronic_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('electronic_invoices')->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();

            $table->unsignedSmallInteger('line_number');
            $table->string('description', 300);
            $table->string('unit_code', 10)->default('94'); // UN (unidad) según UNECE
            $table->decimal('quantity', 12, 4)->default(1);

            // Precios
            $table->decimal('unit_price', 14, 4);               // Precio antes de descuento
            $table->decimal('discount_rate', 8, 6)->default(0);  // 0.10 = 10%
            $table->decimal('discount_value', 14, 2)->default(0);
            $table->decimal('subtotal', 14, 2);                  // qty × price × (1-disc)

            // Tributos por línea
            $table->string('tax_code', 10)->default('01');       // 01=IVA, 04=INC, ZY=exento
            $table->string('tax_name', 50)->default('IVA');
            $table->decimal('tax_rate', 8, 6)->default(0.19);    // 0.19 = 19%
            $table->decimal('tax_base', 14, 2)->default(0);      // Base gravable
            $table->decimal('tax_value', 14, 2)->default(0);     // Valor del impuesto

            $table->decimal('total_line', 14, 2);                // subtotal + tax_value

            // Información adicional para codificación DIAN
            $table->string('standard_code', 50)->nullable();     // EAN/GTIN
            $table->string('brand_name', 100)->nullable();

            $table->timestamps();

            $table->index('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('electronic_invoice_items');
    }
};
