<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Company;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::where('name', 'admin')->first();
        $company   = Company::where('nit', '900000001')->first();

        if (!User::where('email', 'admin@example.com')->exists()) {
            $user = User::create([
                'name'       => 'Administrador',
                'email'      => 'admin@example.com',
                'password'   => 'admin123',
                'role_id'    => $adminRole?->id,
                'company_id' => $company?->id,
                'is_active'  => true,
            ]);

            // Asignar rol Spatie
            $user->assignRole('admin');

            $this->command->info('Usuario administrador creado: admin@example.com / admin123');
        } else {
            $user = User::where('email', 'admin@example.com')->first();

            // Asegurar company_id y rol Spatie en instancias existentes
            if ($company && !$user->company_id) {
                $user->update(['company_id' => $company->id]);
            }

            if (!$user->hasRole('admin')) {
                $user->assignRole('admin');
            }

            $this->command->info('Usuario administrador ya existe.');
        }
    }
}
