<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_balances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->foreign('company_id')->references('id')->on('companies');

            $table->unsignedBigInteger('account_id');
            $table->foreign('account_id')->references('id')->on('puc_accounts');

            $table->unsignedBigInteger('period_id');
            $table->foreign('period_id')->references('id')->on('accounting_periods');

            $table->decimal('opening_debit', 18, 4)->default(0);
            $table->decimal('opening_credit', 18, 4)->default(0);
            $table->decimal('period_debit', 18, 4)->default(0);
            $table->decimal('period_credit', 18, 4)->default(0);
            $table->decimal('closing_debit', 18, 4)->default(0);
            $table->decimal('closing_credit', 18, 4)->default(0);

            $table->timestamps();

            $table->unique(['company_id', 'account_id', 'period_id']);
            $table->index(['company_id', 'period_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_balances');
    }
};
