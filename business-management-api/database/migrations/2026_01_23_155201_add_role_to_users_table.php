<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // role_id sin FK constraint: la tabla 'roles' la crea Spatie
            // más adelante en la secuencia de migraciones
            $table->unsignedBigInteger('role_id')->nullable()->after('password');
            $table->boolean('is_active')->default(true)->after('role_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role_id', 'is_active']);
        });
    }
};
