<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Períodos de nómina ────────────────────────────────────────────────
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            $table->string('name', 150);                    // Ej: "Nómina Febrero 2025 - Q1"
            $table->enum('period_type', ['mensual', 'quincenal'])->default('mensual');
            $table->date('start_date');
            $table->date('end_date');
            $table->date('payment_date');

            // Totales (calculados)
            $table->integer('employee_count')->default(0);
            $table->decimal('total_devengado', 15, 2)->default(0);
            $table->decimal('total_deducciones', 15, 2)->default(0);
            $table->decimal('total_aportes_patronales', 15, 2)->default(0);
            $table->decimal('total_neto', 15, 2)->default(0);

            // Estado: borrador → calculado → pagado | anulado
            $table->enum('status', ['borrador', 'calculado', 'pagado', 'anulado'])
                  ->default('borrador');

            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'start_date']);
        });

        // ── Items de nómina (un registro por empleado por período) ───────────
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payroll_period_id')->constrained('payroll_periods')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            // Días trabajados
            $table->decimal('worked_days', 5, 2)->default(30);

            // IBC (Ingreso Base de Cotización)
            $table->decimal('ibc', 15, 2)->default(0);

            // ── DEVENGADOS ────────────────────────────────────────────────────
            $table->decimal('basic_salary', 15, 2)->default(0);       // Salario por días trabajados
            $table->decimal('transport_allowance', 15, 2)->default(0);// Auxilio de transporte
            $table->decimal('overtime_diurnal', 15, 2)->default(0);   // HED (25%)
            $table->decimal('overtime_nocturnal', 15, 2)->default(0); // HEN (75%)
            $table->decimal('overtime_holiday', 15, 2)->default(0);   // HEDom (100%)
            $table->decimal('commissions', 15, 2)->default(0);
            $table->decimal('bonuses', 15, 2)->default(0);
            $table->decimal('other_income', 15, 2)->default(0);
            $table->decimal('total_devengado', 15, 2)->default(0);

            // ── DEDUCCIONES EMPLEADO ──────────────────────────────────────────
            $table->decimal('health_employee', 15, 2)->default(0);    // 4%
            $table->decimal('pension_employee', 15, 2)->default(0);   // 4%
            $table->decimal('solidarity_fund', 15, 2)->default(0);    // 1% si > 4 SMMLV
            $table->decimal('loans_deduction', 15, 2)->default(0);
            $table->decimal('other_deductions', 15, 2)->default(0);
            $table->decimal('total_deducciones', 15, 2)->default(0);

            // Neto a pagar
            $table->decimal('net_pay', 15, 2)->default(0);

            // ── APORTES PATRONALES ────────────────────────────────────────────
            $table->decimal('health_employer', 15, 2)->default(0);    // 8.5%
            $table->decimal('pension_employer', 15, 2)->default(0);   // 12%
            $table->decimal('arl', 15, 2)->default(0);                // 0.52–6.96%
            $table->decimal('sena', 15, 2)->default(0);               // 2%
            $table->decimal('icbf', 15, 2)->default(0);               // 3%
            $table->decimal('compensation_fund', 15, 2)->default(0);  // 4%
            $table->decimal('total_aportes_patronales', 15, 2)->default(0);

            $table->timestamps();

            $table->unique(['payroll_period_id', 'employee_id']);
            $table->index(['company_id', 'payroll_period_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
        Schema::dropIfExists('payroll_periods');
    }
};
