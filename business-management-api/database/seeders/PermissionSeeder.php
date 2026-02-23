<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    private array $permissions = [
        // Contabilidad
        'accounting.view',
        'accounting.create',
        'accounting.edit',
        'accounting.delete',
        'accounting.post',
        'accounting.close_period',

        // Facturacion Electronica
        'invoices.view',
        'invoices.create',
        'invoices.edit',
        'invoices.cancel',
        'invoices.send_dian',

        // Inventario
        'inventory.view',
        'inventory.create',
        'inventory.edit',
        'inventory.delete',
        'inventory.adjust',

        // Tesoreria
        'treasury.view',
        'treasury.create',
        'treasury.edit',
        'treasury.delete',
        'treasury.reconcile',

        // Nomina
        'payroll.view',
        'payroll.calculate',
        'payroll.approve',
        'payroll.send_dian',

        // Impuestos
        'taxes.view',
        'taxes.calculate',
        'taxes.file',

        // Reportes
        'reports.view',
        'reports.export',

        // Terceros
        'third_parties.view',
        'third_parties.create',
        'third_parties.edit',
        'third_parties.delete',

        // Usuarios
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',

        // Empresa
        'company.settings',
        'company.dian_config',

        // Compras
        'purchases.view',
        'purchases.create',
        'purchases.edit',
        'purchases.delete',
        'purchases.receive',

        // Ventas
        'sales.view',
        'sales.create',
        'sales.cancel',
    ];

    private array $roles = [
        'super_admin' => '*', // all permissions
        'admin' => [
            'accounting.*',
            'invoices.*',
            'inventory.*',
            'treasury.*',
            'payroll.*',
            'taxes.*',
            'reports.*',
            'third_parties.*',
            'users.*',
            'company.settings',
            'purchases.*',
            'sales.*',
        ],
        'accountant' => [
            'accounting.*',
            'invoices.*',
            'reports.*',
            'taxes.*',
            'third_parties.view',
            'third_parties.create',
            'third_parties.edit',
            'inventory.view',
            'treasury.view',
            'treasury.reconcile',
            'sales.view',
            'purchases.view',
        ],
        'sales' => [
            'invoices.view',
            'invoices.create',
            'invoices.cancel',
            'inventory.view',
            'third_parties.view',
            'third_parties.create',
            'third_parties.edit',
            'sales.view',
            'sales.create',
            'sales.cancel',
            'reports.view',
        ],
        'warehouse' => [
            'inventory.*',
            'purchases.view',
            'purchases.receive',
            'third_parties.view',
        ],
        'payroll_officer' => [
            'payroll.*',
            'third_parties.view',
            'reports.view',
            'reports.export',
        ],
        'viewer' => [
            'accounting.view',
            'invoices.view',
            'inventory.view',
            'treasury.view',
            'payroll.view',
            'taxes.view',
            'reports.view',
            'third_parties.view',
            'users.view',
            'purchases.view',
            'sales.view',
        ],
        // Rol por defecto para nuevos registros (acceso básico de lectura)
        'user' => [
            'invoices.view',
            'inventory.view',
            'reports.view',
            'sales.view',
            'purchases.view',
            'third_parties.view',
        ],
    ];

    public function run(): void
    {
        // Crear todos los permisos
        foreach ($this->permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $this->command->info('Permisos creados: '.count($this->permissions));

        // Crear roles con sus permisos
        foreach ($this->roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

            if ($rolePermissions === '*') {
                $role->syncPermissions(Permission::all());
            } else {
                $resolved = [];
                foreach ($rolePermissions as $pattern) {
                    if (str_ends_with($pattern, '.*')) {
                        $prefix = str_replace('.*', '.', $pattern);
                        $matched = Permission::where('name', 'like', $prefix.'%')->pluck('name')->toArray();
                        $resolved = array_merge($resolved, $matched);
                    } else {
                        $resolved[] = $pattern;
                    }
                }
                $role->syncPermissions(array_unique($resolved));
            }

            $this->command->info("Rol '{$roleName}' configurado.");
        }
    }
}
