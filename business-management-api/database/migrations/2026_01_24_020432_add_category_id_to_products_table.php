<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('category_id')
                  ->nullable() // Permitir productos sin categoría temporalmente
                  ->after('name')
                  ->constrained('categories')
                  ->onDelete('restrict'); // No eliminar categoría si tiene productos
            
            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });
    }
};