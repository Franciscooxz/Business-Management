<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Electronics',
                'slug' => 'electronics',
                'description' => 'Electronic devices and gadgets',
                'is_active' => true,
            ],
            [
                'name' => 'Computers & Laptops',
                'slug' => 'computers-laptops',
                'description' => 'Desktop computers, laptops, and accessories',
                'is_active' => true,
            ],
            [
                'name' => 'Peripherals',
                'slug' => 'peripherals',
                'description' => 'Computer peripherals like keyboards, mice, monitors',
                'is_active' => true,
            ],
            [
                'name' => 'Office Supplies',
                'slug' => 'office-supplies',
                'description' => 'Office furniture and supplies',
                'is_active' => true,
            ],
            [
                'name' => 'Gaming',
                'slug' => 'gaming',
                'description' => 'Gaming equipment and accessories',
                'is_active' => true,
            ],
        ];

        foreach ($categories as $category) {
            Category::firstOrCreate(
                ['name' => $category['name']], // Busca por nombre
                $category // Si no existe, crea con estos datos
            );
        }
    }
}