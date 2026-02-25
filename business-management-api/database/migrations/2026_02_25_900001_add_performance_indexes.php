<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Fase 9 — Índices de rendimiento
 *
 * Agrega índices compuestos en todas las tablas ERP para optimizar
 * las queries más frecuentes (reportes, filtros por empresa, búsquedas).
 * Se usan índices condicionales para no duplicar si ya existen.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Contabilidad: PUC ──────────────────────────────────────────────────
        Schema::table('puc_accounts', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'puc_accounts', ['company_id', 'code'],   'idx_puc_company_code');
            $this->addIndexIfNotExists($table, 'puc_accounts', ['company_id', 'type'],   'idx_puc_company_type');
            $this->addIndexIfNotExists($table, 'puc_accounts', ['company_id', 'level'],  'idx_puc_company_level');
            $this->addIndexIfNotExists($table, 'puc_accounts', ['parent_id'],            'idx_puc_parent_id');
            $this->addIndexIfNotExists($table, 'puc_accounts', ['company_id', 'is_active', 'allows_entries'], 'idx_puc_entries_active');
        });

        // ── Contabilidad: Comprobantes ─────────────────────────────────────────
        Schema::table('vouchers', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'vouchers', ['company_id', 'date'],        'idx_vouchers_company_date');
            $this->addIndexIfNotExists($table, 'vouchers', ['company_id', 'status'],      'idx_vouchers_company_status');
            $this->addIndexIfNotExists($table, 'vouchers', ['company_id', 'voucher_type'],'idx_vouchers_company_type');
            $this->addIndexIfNotExists($table, 'vouchers', ['company_id', 'status', 'date'], 'idx_vouchers_reports');
        });

        // ── Contabilidad: Líneas de comprobante ────────────────────────────────
        Schema::table('voucher_lines', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'voucher_lines', ['voucher_id'],              'idx_vlines_voucher_id');
            $this->addIndexIfNotExists($table, 'voucher_lines', ['account_id'],              'idx_vlines_account_id');
            $this->addIndexIfNotExists($table, 'voucher_lines', ['account_id', 'voucher_id'],'idx_vlines_account_voucher');
        });

        // ── Terceros ───────────────────────────────────────────────────────────
        Schema::table('third_parties', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'third_parties', ['company_id', 'document_number'], 'idx_third_company_doc');
            $this->addIndexIfNotExists($table, 'third_parties', ['company_id', 'document_type'],   'idx_third_company_dtype');
            $this->addIndexIfNotExists($table, 'third_parties', ['company_id', 'is_customer'],     'idx_third_company_customer');
            $this->addIndexIfNotExists($table, 'third_parties', ['company_id', 'is_supplier'],     'idx_third_company_supplier');
        });

        // ── Tesorería: Cuentas bancarias ───────────────────────────────────────
        Schema::table('bank_accounts', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'bank_accounts', ['company_id', 'is_active'], 'idx_bank_company_active');
        });

        // ── Tesorería: Movimientos ─────────────────────────────────────────────
        Schema::table('treasury_movements', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'treasury_movements', ['company_id', 'movement_date'],  'idx_treasury_company_date');
            $this->addIndexIfNotExists($table, 'treasury_movements', ['company_id', 'type'],           'idx_treasury_company_type');
            $this->addIndexIfNotExists($table, 'treasury_movements', ['bank_account_id'],              'idx_treasury_bank_account');
            $this->addIndexIfNotExists($table, 'treasury_movements', ['company_id', 'status'],         'idx_treasury_company_status');
        });

        // ── Tesorería: CxC / CxP ──────────────────────────────────────────────
        if (Schema::hasTable('accounts_receivable')) {
            Schema::table('accounts_receivable', function (Blueprint $table) {
                $this->addIndexIfNotExists($table, 'accounts_receivable', ['company_id', 'status'],    'idx_ar_company_status');
                $this->addIndexIfNotExists($table, 'accounts_receivable', ['company_id', 'due_date'],  'idx_ar_company_due');
                $this->addIndexIfNotExists($table, 'accounts_receivable', ['third_party_id'],          'idx_ar_third_party');
            });
        }

        if (Schema::hasTable('accounts_payable')) {
            Schema::table('accounts_payable', function (Blueprint $table) {
                $this->addIndexIfNotExists($table, 'accounts_payable', ['company_id', 'status'],   'idx_ap_company_status');
                $this->addIndexIfNotExists($table, 'accounts_payable', ['company_id', 'due_date'], 'idx_ap_company_due');
                $this->addIndexIfNotExists($table, 'accounts_payable', ['third_party_id'],         'idx_ap_third_party');
            });
        }

        // ── Nómina ────────────────────────────────────────────────────────────
        Schema::table('employees', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'employees', ['company_id', 'status'],          'idx_employees_company_status');
            $this->addIndexIfNotExists($table, 'employees', ['company_id', 'document_number'], 'idx_employees_company_doc');
        });

        if (Schema::hasTable('payroll_periods')) {
            Schema::table('payroll_periods', function (Blueprint $table) {
                $this->addIndexIfNotExists($table, 'payroll_periods', ['company_id', 'status'],     'idx_payroll_company_status');
                $this->addIndexIfNotExists($table, 'payroll_periods', ['company_id', 'start_date'], 'idx_payroll_company_year');
            });
        }

        // ── Impuestos ─────────────────────────────────────────────────────────
        Schema::table('tax_concepts', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'tax_concepts', ['company_id', 'type'],     'idx_tax_concepts_type');
            $this->addIndexIfNotExists($table, 'tax_concepts', ['company_id', 'is_active'],'idx_tax_concepts_active');
        });

        Schema::table('withholding_entries', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'withholding_entries', ['company_id', 'document_date'],  'idx_wh_company_date');
            $this->addIndexIfNotExists($table, 'withholding_entries', ['company_id', 'direction'],      'idx_wh_company_direction');
            $this->addIndexIfNotExists($table, 'withholding_entries', ['tax_concept_id'],               'idx_wh_concept_id');
            $this->addIndexIfNotExists($table, 'withholding_entries', ['tax_declaration_id'],           'idx_wh_declaration_id');
        });

        Schema::table('tax_declarations', function (Blueprint $table) {
            $this->addIndexIfNotExists($table, 'tax_declarations', ['company_id', 'type', 'year'], 'idx_td_company_type_year');
            $this->addIndexIfNotExists($table, 'tax_declarations', ['company_id', 'status'],       'idx_td_company_status');
        });

        // ── Facturación Electrónica ────────────────────────────────────────────
        if (Schema::hasTable('electronic_invoices')) {
            Schema::table('electronic_invoices', function (Blueprint $table) {
                $this->addIndexIfNotExists($table, 'electronic_invoices', ['company_id', 'issue_date'], 'idx_ei_company_date');
                $this->addIndexIfNotExists($table, 'electronic_invoices', ['company_id', 'status'],     'idx_ei_company_status');
            });
        }
    }

    public function down(): void
    {
        $indexes = [
            'puc_accounts'         => ['idx_puc_company_code','idx_puc_company_type','idx_puc_company_level','idx_puc_parent_id','idx_puc_entries_active'],
            'vouchers'             => ['idx_vouchers_company_date','idx_vouchers_company_status','idx_vouchers_company_type','idx_vouchers_reports'],
            'voucher_lines'        => ['idx_vlines_voucher_id','idx_vlines_account_id','idx_vlines_account_voucher'],
            'third_parties'        => ['idx_third_company_doc','idx_third_company_dtype','idx_third_company_customer','idx_third_company_supplier'],
            'bank_accounts'        => ['idx_bank_company_active'],
            'treasury_movements'   => ['idx_treasury_company_date','idx_treasury_company_type','idx_treasury_bank_account','idx_treasury_company_status'],
            'employees'            => ['idx_employees_company_status','idx_employees_company_doc'],
            'tax_concepts'         => ['idx_tax_concepts_type','idx_tax_concepts_active'],
            'withholding_entries'  => ['idx_wh_company_date','idx_wh_company_direction','idx_wh_concept_id','idx_wh_declaration_id'],
            'tax_declarations'     => ['idx_td_company_type_year','idx_td_company_status'],
        ];

        foreach ($indexes as $table => $tableIndexes) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($tableIndexes) {
                    foreach ($tableIndexes as $idx) {
                        try { $t->dropIndex($idx); } catch (\Exception $e) {}
                    }
                });
            }
        }
    }

    /**
     * Agrega un índice solo si no existe ya en la tabla.
     */
    private function addIndexIfNotExists(Blueprint $table, string $tableName, array $columns, string $indexName): void
    {
        try {
            // MySQL: SHOW INDEX FROM `table`
            $existingIndexes = collect(DB::select("SHOW INDEX FROM `{$tableName}`"))
                ->pluck('Key_name')
                ->unique()
                ->toArray();

            if (! in_array($indexName, $existingIndexes)) {
                $table->index($columns, $indexName);
            }
        } catch (\Exception $e) {
            // Fallback (SQLite en tests) — intenta directo, ignorar si ya existe
            try {
                $table->index($columns, $indexName);
            } catch (\Exception $e2) {
                // Ya existe o columna no existe, ignorar
            }
        }
    }
};
