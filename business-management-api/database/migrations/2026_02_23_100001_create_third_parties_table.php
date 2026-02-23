<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('third_parties', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->foreign('company_id')->references('id')->on('companies');

            // Identificacion
            $table->string('document_type', 10); // NIT, CC, CE, PAS, TE
            $table->string('document_number', 20);
            $table->char('dv', 1)->nullable(); // Digito verificacion NIT

            // Nombre
            $table->string('first_name', 100)->nullable();  // Persona natural
            $table->string('last_name', 100)->nullable();
            $table->string('razon_social', 500)->nullable(); // Persona juridica
            $table->string('nombre_comercial')->nullable();

            // Clasificacion
            $table->boolean('is_customer')->default(false);
            $table->boolean('is_supplier')->default(false);
            $table->boolean('is_employee')->default(false);
            $table->string('persona_type', 20)->default('juridica'); // natural, juridica

            // Regimen tributario
            $table->string('regimen_tributario', 50)->nullable(); // simplificado, comun
            $table->boolean('responsable_iva')->default(false);
            $table->boolean('gran_contribuyente')->default(false);
            $table->boolean('autorretenedor')->default(false);
            $table->boolean('declarante_renta')->default(false);
            $table->string('actividad_economica', 10)->nullable(); // CIIU

            // Retenciones
            $table->boolean('apply_retefuente')->default(true);
            $table->boolean('apply_reteica')->default(false);
            $table->boolean('apply_reteiva')->default(false);
            $table->decimal('reteica_rate', 8, 6)->nullable();

            // Contacto
            $table->string('email')->nullable();
            $table->string('email_fe')->nullable(); // Email para facturacion electronica
            $table->string('phone', 30)->nullable();
            $table->string('mobile', 30)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('country', 10)->default('CO');

            // Migracion (referencia a tablas anteriores)
            $table->unsignedBigInteger('legacy_customer_id')->nullable();
            $table->unsignedBigInteger('legacy_supplier_id')->nullable();

            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'document_type', 'document_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('third_parties');
    }
};
