<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->string('code', 3)->unique(); // USD, COP, EUR
            $table->string('name', 50); // Dólar Estadounidense
            $table->string('symbol', 10); // $, €, $
            $table->decimal('exchange_rate', 12, 6)->default(1); // Tasa de cambio
            $table->boolean('is_base')->default(false); // Moneda base del sistema
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('currencies');
    }
};