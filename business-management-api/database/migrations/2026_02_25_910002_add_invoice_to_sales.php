<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (! Schema::hasColumn('sales', 'electronic_invoice_id')) {
                $table->unsignedBigInteger('electronic_invoice_id')
                      ->nullable()
                      ->after('notes');
                $table->index('electronic_invoice_id');
            }

            if (! Schema::hasColumn('sales', 'company_id')) {
                $table->unsignedBigInteger('company_id')
                      ->nullable()
                      ->after('id');
                $table->index('company_id');
            }

            if (! Schema::hasColumn('sales', 'third_party_id')) {
                $table->unsignedBigInteger('third_party_id')
                      ->nullable()
                      ->after('customer_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['electronic_invoice_id', 'company_id', 'third_party_id']);
        });
    }
};
