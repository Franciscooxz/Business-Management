<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Company;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        if (!Company::where('nit', '900000001')->exists()) {
            Company::create([
                'name'                => 'Empresa Demo S.A.S',
                'nit'                 => '900000001',
                'nit_dv'              => '3',
                'razon_social'        => 'EMPRESA DEMO S.A.S.',
                'nombre_comercial'    => 'Empresa Demo',
                'tipo_persona'        => 'juridica',
                'regimen_tributario'  => 'comun',
                'responsable_iva'     => true,
                'email'               => 'info@empresademo.com.co',
                'phone'               => '6017001234',
                'address'             => 'Calle 100 # 15-30 Of. 201',
                'city'                => 'Bogota',
                'department'          => 'Cundinamarca',
                'dian_ambiente'       => 'habilitacion',
                'plan'                => 'profesional',
                'is_active'           => true,
                'decimal_places'      => 2,
            ]);

            $this->command->info('Empresa demo creada.');
        } else {
            $this->command->info('Empresa demo ya existe.');
        }
    }
}
