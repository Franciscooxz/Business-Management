<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PayrollSettingSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::first();
        if (!$company) return;

        DB::table('payroll_settings')->insertOrIgnore([
            'company_id'          => $company->id,
            'year'                => 2025,
            'smmlv'               => 1_423_500.00,
            'transport_allowance' => 202_000.00,
            'is_active'           => true,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        echo "Configuración de nómina 2025: SMMLV=$1,423,500 / Auxilio=$202,000\n";
    }
}
