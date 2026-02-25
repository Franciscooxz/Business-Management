<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Contexto de empresa (nullable para eventos de auth sin empresa aún)
            $table->unsignedBigInteger('company_id')->nullable()->index();

            // Usuario que realizó la acción (nullable para acciones del sistema)
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name')->nullable();  // snapshot del nombre al momento del evento

            // Tipo de evento
            $table->enum('event', [
                'created',
                'updated',
                'deleted',
                'restored',
                'login',
                'logout',
                'login_failed',
                'token_expired',
                'unauthorized',
            ])->index();

            // Modelo afectado (nullable para eventos de auth)
            $table->string('model_type')->nullable()->index();   // Ej: App\Models\Voucher
            $table->unsignedBigInteger('model_id')->nullable();  // ID del registro
            $table->string('model_label')->nullable();           // Descripción legible (Ej: "Comprobante VD-000123")

            // Valores antes/después del cambio (solo en updated)
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Contexto de red
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('url')->nullable();

            // Descripción libre (para eventos de auth u otros)
            $table->string('description')->nullable();

            $table->timestamp('created_at')->useCurrent()->index();

            // Sin updated_at — los logs son inmutables
            $table->index(['company_id', 'event']);
            $table->index(['company_id', 'model_type', 'model_id']);
            $table->index(['company_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
