<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            // Vincula la venta con una factura electrónica DIAN generada desde el POS
            $table->unsignedBigInteger('electronic_invoice_id')
                  ->nullable()
                  ->after('notes');

            // Empresa (para filtros multi-tenant en el futuro)
            $table->unsignedBigInteger('company_id')
                  ->nullable()
                  ->after('id');

            // Tercero DIAN del comprador (para generar factura electrónica)
            $table->unsignedBigInteger('third_party_id')
                  ->nullable()
                  ->after('customer_id');

            $table->index('company_id');
            $table->index('electronic_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['electronic_invoice_id', 'company_id', 'third_party_id']);
        });
    }
};
