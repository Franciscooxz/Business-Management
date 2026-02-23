<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('nit', 20)->unique();
            $table->char('nit_dv', 1)->nullable();
            $table->string('razon_social', 500)->nullable();
            $table->string('nombre_comercial')->nullable();
            $table->string('tipo_persona', 20)->default('juridica'); // natural, juridica
            $table->string('regimen_tributario', 50)->default('comun'); // simplificado, comun, gran_contribuyente
            $table->boolean('responsable_iva')->default(false);
            $table->boolean('gran_contribuyente')->default(false);
            $table->boolean('autorretenedor')->default(false);
            $table->string('actividad_economica', 10)->nullable(); // CIIU
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('logo_path', 500)->nullable();

            // Configuracion DIAN
            $table->string('dian_ambiente', 20)->default('habilitacion'); // habilitacion, produccion
            $table->string('dian_software_id', 100)->nullable();
            $table->string('dian_software_pin', 100)->nullable();
            $table->string('dian_certificate_path', 500)->nullable();
            $table->string('dian_certificate_pass', 255)->nullable();
            $table->string('dian_technical_key', 100)->nullable();
            $table->string('dian_prefix', 10)->nullable();
            $table->string('dian_resolution_number', 50)->nullable();
            $table->date('dian_resolution_date')->nullable();
            $table->integer('dian_resolution_from')->nullable();
            $table->integer('dian_resolution_to')->nullable();
            $table->date('dian_resolution_valid_until')->nullable();
            $table->string('dian_provider', 30)->nullable(); // edicom, gosocket, direct

            // Configuracion del sistema
            $table->string('plan', 30)->default('basico');
            $table->boolean('is_active')->default(true);
            $table->date('fiscal_year_start')->nullable();
            $table->unsignedBigInteger('default_currency_id')->nullable();
            $table->smallInteger('decimal_places')->default(2);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
