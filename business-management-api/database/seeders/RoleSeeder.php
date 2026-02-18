<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // firstOrCreate: Crea solo si no existe
        Role::firstOrCreate(
            ['name' => 'admin'], // Busca por este campo
            [ // Si no existe, crea con estos datos
                'description' => 'Administrator with full access',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        Role::firstOrCreate(
            ['name' => 'user'],
            [
                'description' => 'Regular user with limited access',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}