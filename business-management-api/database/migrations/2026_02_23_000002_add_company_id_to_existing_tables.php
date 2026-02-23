<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'users',
        'products',
        'categories',
        'customers',
        'sales',
        'sale_items',
        'stock_movements',
        'currencies',
        'suppliers',
        'purchase_orders',
        'purchase_order_items',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'company_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->unsignedBigInteger('company_id')->nullable()->after('id');
                    $t->foreign('company_id')->references('id')->on('companies')->nullOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'company_id')) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    $t->dropForeign([$table.'.company_id']);
                    $t->dropColumn('company_id');
                });
            }
        }
    }
};
