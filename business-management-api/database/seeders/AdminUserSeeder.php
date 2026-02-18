<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar el rol admin
        $adminRole = Role::where('name', 'admin')->first();

        // Crear usuario admin (solo si no existe)
        if (!User::where('email', 'admin@example.com')->exists()) {
            User::create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'password' => 'admin123', // Se hashea automáticamente
                'role_id' => $adminRole->id,
                'is_active' => true,
            ]);

            echo "✅ Admin user created successfully!\n";
        } else {
            echo "⚠️  Admin user already exists.\n";
        }
    }
}