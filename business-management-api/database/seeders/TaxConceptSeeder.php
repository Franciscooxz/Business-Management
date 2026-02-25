<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TaxConceptSeeder extends Seeder
{
    // UVT 2025: $49,799
    private const UVT = 49_799;

    /**
     * Conceptos de Retención en la Fuente más comunes en Colombia (2025).
     * Formato: [code, name, rate%, minimum_base_uvt, account_puc]
     *
     * Fuente: Estatuto Tributario Arts. 383-407, Decretos reglamentarios.
     */
    private const RETEFUENTE = [
        ['001',  'Honorarios - PN no declarante',                   10.00,  0,  '236540'],
        ['001B', 'Honorarios - PN declarante / Persona Jurídica',   11.00,  0,  '236540'],
        ['002',  'Servicios en general',                             4.00,  4,  '236545'],
        ['003',  'Arrendamiento de bienes inmuebles',                3.50, 27,  '236545'],
        ['004',  'Arrendamiento de bienes muebles',                  4.00, 27,  '236545'],
        ['005',  'Compras generales (bienes o insumos)',             3.50, 27,  '236510'],
        ['006',  'Contratos de obra o construcción',                 2.00, 27,  '236545'],
        ['007',  'Transporte de carga nacional',                     1.00, 27,  '236545'],
        ['008',  'Transporte nacional de pasajeros',                 3.50, 27,  '236545'],
        ['009',  'Servicios de aseo y vigilancia',                   2.00,  4,  '236545'],
        ['010',  'Servicios temporales de empleo',                   1.00,  4,  '236545'],
        ['011',  'Intereses y rendimientos financieros',             7.00,  0,  '236545'],
        ['012',  'Loterías, rifas, apuestas y similares',           20.00,  0,  '236545'],
        ['013',  'Pagos al exterior - servicios técnicos',          15.00,  0,  '236560'],
    ];

    /**
     * Conceptos de IVA.
     */
    private const IVA = [
        ['IVA19', 'IVA Tarifa General 19%',         19.00, 0, '240810'],
        ['IVA05', 'IVA Tarifa Diferencial 5%',        5.00, 0, '240810'],
        ['IVA00', 'Bien/Servicio Exento 0%',           0.00, 0, null],
    ];

    /**
     * Conceptos de ReteIVA (Retención sobre IVA).
     */
    private const RETEIVA = [
        ['RIVA15', 'ReteIVA 15% del IVA (uso general)', 15.00, 0, '236700'],
    ];

    /**
     * Conceptos de ReteICA (ejemplo tarifa Bogotá).
     * Las tarifas varían por municipio y actividad económica.
     */
    private const RETEICA = [
        ['ICA11', 'ReteICA - Actividades comerciales (11 x mil)',  1.10, 0, '236800'],
        ['ICA04', 'ReteICA - Actividades industriales (4 x mil)',  0.40, 0, '236800'],
        ['ICA10', 'ReteICA - Servicios (10 x mil)',                1.00, 0, '236800'],
    ];

    public function run(): void
    {
        $companies = DB::table('companies')->get();

        foreach ($companies as $company) {
            $this->seedGroup($company->id, self::RETEFUENTE, 'retefuente', 'purchase');
            $this->seedGroup($company->id, self::IVA,       'iva',        'both');
            $this->seedGroup($company->id, self::RETEIVA,   'reteiva',    'purchase');
            $this->seedGroup($company->id, self::RETEICA,   'reteica',    'purchase');
        }
    }

    private function seedGroup(int $companyId, array $concepts, string $type, string $appliesTo): void
    {
        foreach ($concepts as [$code, $name, $rate, $minBaseUvt, $account]) {
            DB::table('tax_concepts')->insertOrIgnore([
                'company_id'   => $companyId,
                'code'         => $code,
                'name'         => $name,
                'type'         => $type,
                'rate'         => $rate,
                'minimum_base' => $minBaseUvt * self::UVT,
                'applies_to'   => $appliesTo,
                'account_code' => $account,
                'is_active'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        }
    }
}
