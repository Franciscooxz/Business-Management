<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Identificación
            $table->string('code', 20)->nullable();         // Código interno empleado
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->enum('document_type', ['CC', 'CE', 'PA', 'TI'])->default('CC');
            $table->string('document_number', 20);
            $table->string('email', 150)->nullable();
            $table->string('phone', 20)->nullable();
            $table->date('birth_date')->nullable();

            // Contrato
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->enum('contract_type', ['indefinido', 'fijo', 'obra_labor', 'aprendizaje'])
                  ->default('indefinido');
            $table->string('position', 100)->nullable();    // Cargo
            $table->string('department', 100)->nullable();  // Área / departamento

            // Salario
            $table->decimal('base_salary', 15, 2);          // Salario base mensual
            $table->boolean('has_transport_allowance')->default(true); // Se sobreescribe al calcular

            // Afiliaciones SS
            $table->string('eps_name', 100)->nullable();
            $table->string('afp_name', 100)->nullable();    // AFP / Pensión
            $table->string('arl_name', 100)->nullable();
            $table->tinyInteger('arl_risk_level')->default(1); // 1-5
            $table->string('compensation_fund', 100)->nullable(); // Caja de Compensación

            // Datos bancarios para dispersión
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_number', 30)->nullable();
            $table->enum('bank_account_type', ['ahorros', 'corriente'])->nullable();

            $table->enum('status', ['activo', 'inactivo', 'retirado'])->default('activo');
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'document_number']);
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
