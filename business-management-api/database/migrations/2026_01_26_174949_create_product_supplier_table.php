<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_supplier', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');
            $table->decimal('cost', 12, 2); // Precio que cobra este proveedor
            $table->string('supplier_sku')->nullable(); // Código del proveedor
            $table->integer('lead_time_days')->nullable(); // Tiempo de entrega
            $table->boolean('is_preferred')->default(false); // Proveedor preferido
            $table->timestamps();
            
            $table->unique(['product_id', 'supplier_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_supplier');
    }
};