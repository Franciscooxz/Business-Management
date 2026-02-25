<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar el rol super_admin en la tabla propia (legacy)
        $superAdminRole = Role::where('name', 'super_admin')->first();

        if (! User::where('email', 'superadmin@adminova.co')->exists()) {
            $user = User::create([
                'name'       => 'Super Admin',
                'email'      => 'superadmin@adminova.co',
                'password'   => 'Adminova2024!',
                'role_id'    => $superAdminRole?->id,
                'company_id' => null, // El super_admin no pertenece a ninguna empresa
                'is_active'  => true,
            ]);

            // Asignar rol Spatie (usado para middleware y permisos)
            $user->assignRole('super_admin');

            $this->command->info('Super Admin creado: superadmin@adminova.co / Adminova2024!');
        } else {
            $user = User::where('email', 'superadmin@adminova.co')->first();

            if (! $user->hasRole('super_admin')) {
                $user->assignRole('super_admin');
            }

            // Asegurarse de que no tenga company_id
            if ($user->company_id) {
                $user->update(['company_id' => null]);
            }

            $this->command->info('Super Admin ya existe.');
        }
    }
}
