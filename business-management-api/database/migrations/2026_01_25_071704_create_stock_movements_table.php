<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['entrada', 'salida', 'ajuste', 'inicial'])->default('ajuste');
            $table->integer('quantity'); // Puede ser negativo para salidas
            $table->integer('previous_stock');
            $table->integer('new_stock');
            $table->string('reason')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index('product_id');
            $table->index('user_id');
            $table->index('type');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};