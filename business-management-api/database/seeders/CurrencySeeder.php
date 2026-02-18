<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Currency;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        $currencies = [
            [
                'code' => 'USD',
                'name' => 'Dólar Estadounidense',
                'symbol' => '$',
                'exchange_rate' => 1.000000, // Moneda base
                'is_base' => true,
                'is_active' => true,
            ],
            [
                'code' => 'COP',
                'name' => 'Peso Colombiano',
                'symbol' => '$',
                'exchange_rate' => 3900.000000, // 1 USD = 3900 COP (ajusta según tasa actual)
                'is_base' => false,
                'is_active' => true,
            ],
            [
                'code' => 'EUR',
                'name' => 'Euro',
                'symbol' => '€',
                'exchange_rate' => 0.920000, // 1 USD = 0.92 EUR (ajusta según tasa actual)
                'is_base' => false,
                'is_active' => true,
            ],
            [
                'code' => 'MXN',
                'name' => 'Peso Mexicano',
                'symbol' => '$',
                'exchange_rate' => 17.500000, // 1 USD = 17.5 MXN (ajusta según tasa actual)
                'is_base' => false,
                'is_active' => true,
            ],
        ];

        foreach ($currencies as $currency) {
            Currency::create($currency);
        }
    }
}