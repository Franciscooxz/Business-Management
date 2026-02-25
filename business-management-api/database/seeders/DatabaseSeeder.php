<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CompanySeeder::class,
            PermissionSeeder::class,   // Crea roles + permisos Spatie
            // RoleSeeder removido: PermissionSeeder ya maneja los roles
            AdminUserSeeder::class,
            CategorySeeder::class,
            // ProductSeeder removido: no existe en este proyecto
            CurrencySeeder::class,
            PucColombiaSeeder::class,
            PayrollSettingSeeder::class,
            TaxConceptSeeder::class,
        ]);
    }
}
