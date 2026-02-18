<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Solo agregar índices que sabemos que NO existen
            $table->index('price', 'idx_products_price');
            $table->index('stock', 'idx_products_stock');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('is_active', 'idx_users_is_active');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_price');
            $table->dropIndex('idx_products_stock');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_is_active');
        });
    }
};