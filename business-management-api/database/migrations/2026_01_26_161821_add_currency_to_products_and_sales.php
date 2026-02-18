<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Agregar currency_id a products
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('currency_id')->nullable()->after('price')->constrained('currencies')->onDelete('set null');
        });

        // Agregar currency_id a sales
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('currency_id')->nullable()->after('total')->constrained('currencies')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropColumn('currency_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropColumn('currency_id');
        });
    }
};