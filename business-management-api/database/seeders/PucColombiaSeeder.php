<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PucAccount;
use App\Models\Company;

class PucColombiaSeeder extends Seeder
{
    /**
     * PUC Colombiano 2024 — estructura simplificada con las cuentas principales.
     * Se cargan los 5 primeros niveles estandar.
     */
    public function run(): void
    {
        $company = Company::first();

        if (!$company) {
            $this->command->error('No hay empresa creada. Ejecute CompanySeeder primero.');
            return;
        }

        if (PucAccount::where('company_id', $company->id)->count() > 0) {
            $this->command->info('PUC ya existe para la empresa '.$company->name);
            return;
        }

        $puc = $this->getPucData();
        $created = 0;
        $parentMap = []; // code => id

        foreach ($puc as $item) {
            $parentId = null;
            if (isset($item['parent_code']) && isset($parentMap[$item['parent_code']])) {
                $parentId = $parentMap[$item['parent_code']];
            }

            $account = PucAccount::create([
                'company_id'    => $company->id,
                'code'          => $item['code'],
                'name'          => $item['name'],
                'parent_id'     => $parentId,
                'level'         => $item['level'],
                'type'          => $item['type'],
                'nature'        => $item['nature'],
                'allows_entries' => $item['level'] >= 4,
                'is_active'     => true,
            ]);

            $parentMap[$item['code']] = $account->id;
            $created++;
        }

        $this->command->info("PUC Colombia creado: {$created} cuentas para empresa '{$company->name}'.");
    }

    private function getPucData(): array
    {
        return [
            // ======================= CLASE 1: ACTIVOS =======================
            ['code' => '1',      'name' => 'ACTIVO',                            'level' => 1, 'type' => 'activo',    'nature' => 'debito'],
            ['code' => '11',     'name' => 'DISPONIBLE',                        'level' => 2, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1'],
            ['code' => '1105',   'name' => 'CAJA',                              'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '11'],
            ['code' => '110505', 'name' => 'Caja general',                      'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1105'],
            ['code' => '110510', 'name' => 'Caja menor',                        'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1105'],
            ['code' => '1110',   'name' => 'DEPOSITOS EN INSTITUCIONES FINANCIERAS', 'level' => 3, 'type' => 'activo', 'nature' => 'debito', 'parent_code' => '11'],
            ['code' => '111005', 'name' => 'Banco cuenta corriente',            'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1110'],
            ['code' => '111010', 'name' => 'Banco cuenta ahorros',              'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1110'],
            ['code' => '12',     'name' => 'INVERSIONES',                       'level' => 2, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1'],
            ['code' => '1205',   'name' => 'ACCIONES',                          'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '12'],
            ['code' => '120505', 'name' => 'Acciones',                          'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1205'],
            ['code' => '13',     'name' => 'DEUDORES',                          'level' => 2, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1'],
            ['code' => '1305',   'name' => 'CLIENTES',                          'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '13'],
            ['code' => '130505', 'name' => 'Clientes nacionales',               'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1305'],
            ['code' => '1355',   'name' => 'ANTICIPO DE IMPUESTOS Y CONTRIBUCIONES', 'level' => 3, 'type' => 'activo', 'nature' => 'debito', 'parent_code' => '13'],
            ['code' => '135515', 'name' => 'Autorretenciones',                  'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1355'],
            ['code' => '135510', 'name' => 'Retencion en la fuente',            'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1355'],
            ['code' => '14',     'name' => 'INVENTARIOS',                       'level' => 2, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1'],
            ['code' => '1435',   'name' => 'MERCANCIAS NO FABRICADAS POR LA EMPRESA', 'level' => 3, 'type' => 'activo', 'nature' => 'debito', 'parent_code' => '14'],
            ['code' => '143505', 'name' => 'Mercancias en existencia',          'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1435'],
            ['code' => '1455',   'name' => 'MATERIAS PRIMAS',                   'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '14'],
            ['code' => '145505', 'name' => 'Materias primas',                   'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1455'],
            ['code' => '15',     'name' => 'PROPIEDADES PLANTA Y EQUIPO',       'level' => 2, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1'],
            ['code' => '1504',   'name' => 'TERRENOS',                          'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '15'],
            ['code' => '150405', 'name' => 'Urbanos',                           'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1504'],
            ['code' => '1516',   'name' => 'CONSTRUCCIONES Y EDIFICACIONES',    'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '15'],
            ['code' => '151605', 'name' => 'Edificios',                         'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1516'],
            ['code' => '1524',   'name' => 'EQUIPO DE OFICINA',                 'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '15'],
            ['code' => '152405', 'name' => 'Muebles y enseres',                 'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1524'],
            ['code' => '1528',   'name' => 'EQUIPO DE COMPUTACION',             'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '15'],
            ['code' => '152805', 'name' => 'Equipos de procesamiento de datos', 'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1528'],
            ['code' => '1592',   'name' => 'DEPRECIACION ACUMULADA',            'level' => 3, 'type' => 'activo',    'nature' => 'credito', 'parent_code' => '15'],
            ['code' => '159216', 'name' => 'Construcciones y edificaciones',    'level' => 4, 'type' => 'activo',    'nature' => 'credito', 'parent_code' => '1592'],
            ['code' => '159224', 'name' => 'Equipo de oficina',                 'level' => 4, 'type' => 'activo',    'nature' => 'credito', 'parent_code' => '1592'],
            ['code' => '159228', 'name' => 'Equipo de computacion',             'level' => 4, 'type' => 'activo',    'nature' => 'credito', 'parent_code' => '1592'],
            ['code' => '16',     'name' => 'INTANGIBLES',                       'level' => 2, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1'],
            ['code' => '1605',   'name' => 'CREDITO MERCANTIL',                 'level' => 3, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '16'],
            ['code' => '160505', 'name' => 'Goodwill',                          'level' => 4, 'type' => 'activo',    'nature' => 'debito', 'parent_code' => '1605'],

            // ======================= CLASE 2: PASIVOS =======================
            ['code' => '2',      'name' => 'PASIVO',                            'level' => 1, 'type' => 'pasivo',   'nature' => 'credito'],
            ['code' => '21',     'name' => 'OBLIGACIONES FINANCIERAS',          'level' => 2, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2'],
            ['code' => '2105',   'name' => 'BANCOS NACIONALES',                 'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '21'],
            ['code' => '210505', 'name' => 'Prestamos bancarios',               'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2105'],
            ['code' => '22',     'name' => 'PROVEEDORES',                       'level' => 2, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2'],
            ['code' => '2205',   'name' => 'NACIONALES',                        'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '22'],
            ['code' => '220505', 'name' => 'Proveedores nacionales',            'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2205'],
            ['code' => '23',     'name' => 'CUENTAS POR PAGAR',                 'level' => 2, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2'],
            ['code' => '2335',   'name' => 'COSTOS Y GASTOS POR PAGAR',         'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '23'],
            ['code' => '233505', 'name' => 'Costos y gastos por pagar',         'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2335'],
            ['code' => '2360',   'name' => 'DIVIDENDOS O PARTICIPACIONES POR PAGAR', 'level' => 3, 'type' => 'pasivo', 'nature' => 'credito', 'parent_code' => '23'],
            ['code' => '2365',   'name' => 'RETENCION EN LA FUENTE',            'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '23'],
            ['code' => '236505', 'name' => 'Salarios y pagos laborales',        'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2365'],
            ['code' => '236510', 'name' => 'Honorarios',                        'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2365'],
            ['code' => '236515', 'name' => 'Servicios',                         'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2365'],
            ['code' => '236520', 'name' => 'Arrendamientos',                    'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2365'],
            ['code' => '236530', 'name' => 'Compras',                           'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2365'],
            ['code' => '2367',   'name' => 'IMPUESTO A LAS VENTAS RETENIDO',    'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '23'],
            ['code' => '236705', 'name' => 'Reteiva',                           'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2367'],
            ['code' => '2368',   'name' => 'IMPUESTO DE INDUSTRIA Y COMERCIO RETENIDO', 'level' => 3, 'type' => 'pasivo', 'nature' => 'credito', 'parent_code' => '23'],
            ['code' => '236805', 'name' => 'Reteica',                           'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2368'],
            ['code' => '24',     'name' => 'IMPUESTOS GRAVAMENES Y TASAS',      'level' => 2, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2'],
            ['code' => '2404',   'name' => 'DE RENTA Y COMPLEMENTARIOS',        'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '24'],
            ['code' => '240405', 'name' => 'Vigencia fiscal corriente',         'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2404'],
            ['code' => '2408',   'name' => 'IMPUESTO SOBRE LAS VENTAS POR PAGAR', 'level' => 3, 'type' => 'pasivo', 'nature' => 'credito', 'parent_code' => '24'],
            ['code' => '240805', 'name' => 'IVA por pagar',                     'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2408'],
            ['code' => '240408', 'name' => 'IVA descontable',                   'level' => 4, 'type' => 'pasivo',   'nature' => 'debito',  'parent_code' => '2408'],
            ['code' => '25',     'name' => 'OBLIGACIONES LABORALES',            'level' => 2, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2'],
            ['code' => '2505',   'name' => 'SALARIOS POR PAGAR',                'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '250505', 'name' => 'Nominas por pagar',                 'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2505'],
            ['code' => '2510',   'name' => 'CESANTIAS CONSOLIDADAS',            'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '251005', 'name' => 'Cesantias',                         'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2510'],
            ['code' => '2515',   'name' => 'INTERESES SOBRE CESANTIAS',         'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '251505', 'name' => 'Intereses sobre cesantias',         'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2515'],
            ['code' => '2520',   'name' => 'PRIMA DE SERVICIOS',                'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '252005', 'name' => 'Prima de servicios',                'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2520'],
            ['code' => '2525',   'name' => 'VACACIONES CONSOLIDADAS',           'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '252505', 'name' => 'Vacaciones',                        'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2525'],
            ['code' => '2550',   'name' => 'APORTES A ENTIDADES PROMOTORAS DE SALUD EPS', 'level' => 3, 'type' => 'pasivo', 'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '255005', 'name' => 'Aportes a EPS',                     'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2550'],
            ['code' => '2555',   'name' => 'APORTES A FONDOS DE PENSION Y CESANTIAS', 'level' => 3, 'type' => 'pasivo', 'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '255505', 'name' => 'Aportes a fondos de pension',       'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2555'],
            ['code' => '2560',   'name' => 'APORTES A ARL',                     'level' => 3, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '25'],
            ['code' => '256005', 'name' => 'Aportes a ARL',                     'level' => 4, 'type' => 'pasivo',   'nature' => 'credito', 'parent_code' => '2560'],

            // ======================= CLASE 3: PATRIMONIO =======================
            ['code' => '3',      'name' => 'PATRIMONIO',                        'level' => 1, 'type' => 'patrimonio', 'nature' => 'credito'],
            ['code' => '31',     'name' => 'CAPITAL SOCIAL',                    'level' => 2, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3'],
            ['code' => '3105',   'name' => 'CAPITAL SUSCRITO Y PAGADO',         'level' => 3, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '31'],
            ['code' => '310505', 'name' => 'Capital suscrito y pagado',         'level' => 4, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3105'],
            ['code' => '33',     'name' => 'RESERVAS',                          'level' => 2, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3'],
            ['code' => '3305',   'name' => 'RESERVA LEGAL',                     'level' => 3, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '33'],
            ['code' => '330505', 'name' => 'Apropiaciones para reserva legal',  'level' => 4, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3305'],
            ['code' => '36',     'name' => 'RESULTADOS DEL EJERCICIO',          'level' => 2, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3'],
            ['code' => '3605',   'name' => 'UTILIDAD DEL EJERCICIO',            'level' => 3, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '36'],
            ['code' => '360505', 'name' => 'Utilidad del ejercicio',            'level' => 4, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3605'],
            ['code' => '3610',   'name' => 'PERDIDA DEL EJERCICIO',             'level' => 3, 'type' => 'patrimonio', 'nature' => 'debito',  'parent_code' => '36'],
            ['code' => '361005', 'name' => 'Perdida del ejercicio',             'level' => 4, 'type' => 'patrimonio', 'nature' => 'debito',  'parent_code' => '3610'],
            ['code' => '37',     'name' => 'RESULTADOS DE EJERCICIOS ANTERIORES', 'level' => 2, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3'],
            ['code' => '3705',   'name' => 'UTILIDADES ACUMULADAS',             'level' => 3, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '37'],
            ['code' => '370505', 'name' => 'Utilidades acumuladas',             'level' => 4, 'type' => 'patrimonio', 'nature' => 'credito', 'parent_code' => '3705'],

            // ======================= CLASE 4: INGRESOS =======================
            ['code' => '4',      'name' => 'INGRESOS',                          'level' => 1, 'type' => 'ingreso',  'nature' => 'credito'],
            ['code' => '41',     'name' => 'OPERACIONALES',                     'level' => 2, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '4'],
            ['code' => '4135',   'name' => 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'level' => 3, 'type' => 'ingreso', 'nature' => 'credito', 'parent_code' => '41'],
            ['code' => '413505', 'name' => 'Comercio al por mayor y menor',     'level' => 4, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '4135'],
            ['code' => '4155',   'name' => 'SERVICIOS',                         'level' => 3, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '41'],
            ['code' => '415505', 'name' => 'Ingresos por servicios',            'level' => 4, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '4155'],
            ['code' => '42',     'name' => 'NO OPERACIONALES',                  'level' => 2, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '4'],
            ['code' => '4210',   'name' => 'FINANCIEROS',                       'level' => 3, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '42'],
            ['code' => '421005', 'name' => 'Intereses',                         'level' => 4, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '4210'],
            ['code' => '421010', 'name' => 'Rendimientos financieros',          'level' => 4, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '4210'],
            ['code' => '4250',   'name' => 'RECUPERACIONES',                    'level' => 3, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '42'],
            ['code' => '425005', 'name' => 'Recuperacion de provisiones',       'level' => 4, 'type' => 'ingreso',  'nature' => 'credito', 'parent_code' => '4250'],

            // ======================= CLASE 5: GASTOS =======================
            ['code' => '5',      'name' => 'GASTOS',                            'level' => 1, 'type' => 'gasto',    'nature' => 'debito'],
            ['code' => '51',     'name' => 'OPERACIONALES DE ADMINISTRACION',   'level' => 2, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5'],
            ['code' => '5105',   'name' => 'GASTOS DE PERSONAL',                'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '510506', 'name' => 'Sueldos',                           'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510510', 'name' => 'Horas extras y recargos',           'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510515', 'name' => 'Vacaciones',                        'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510518', 'name' => 'Prima de servicios',                'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510527', 'name' => 'Cesantias',                         'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510530', 'name' => 'Intereses sobre cesantias',         'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510536', 'name' => 'Aportes a EPS',                     'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510539', 'name' => 'Aportes a fondos de pensiones',     'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510542', 'name' => 'Aportes a cajas de compensacion',   'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510545', 'name' => 'Aportes SENA',                      'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510548', 'name' => 'Aportes ICBF',                      'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '510551', 'name' => 'Aportes a ARL',                     'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5105'],
            ['code' => '5110',   'name' => 'HONORARIOS',                        'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '511005', 'name' => 'Junta directiva',                   'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5110'],
            ['code' => '511010', 'name' => 'Revisor fiscal',                    'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5110'],
            ['code' => '511015', 'name' => 'Consultores',                       'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5110'],
            ['code' => '5120',   'name' => 'ARRENDAMIENTOS',                    'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '512005', 'name' => 'Arrendamiento bienes inmuebles',    'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5120'],
            ['code' => '5125',   'name' => 'CONTRIBUCIONES Y AFILIACIONES',     'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '512505', 'name' => 'Contribuciones y afiliaciones',     'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5125'],
            ['code' => '5130',   'name' => 'SEGUROS',                           'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '513005', 'name' => 'Seguros',                           'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5130'],
            ['code' => '5135',   'name' => 'SERVICIOS',                         'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '513510', 'name' => 'Aseo y vigilancia',                 'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5135'],
            ['code' => '513515', 'name' => 'Acueducto y alcantarillado',        'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5135'],
            ['code' => '513520', 'name' => 'Energia electrica',                 'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5135'],
            ['code' => '513525', 'name' => 'Telefono',                          'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5135'],
            ['code' => '513530', 'name' => 'Internet',                          'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5135'],
            ['code' => '5145',   'name' => 'MANTENIMIENTO Y REPARACIONES',      'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '514505', 'name' => 'Mantenimiento y reparaciones',      'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5145'],
            ['code' => '5160',   'name' => 'IMPUESTOS',                         'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '516005', 'name' => 'Industria y comercio',              'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5160'],
            ['code' => '5195',   'name' => 'DIVERSOS',                          'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '51'],
            ['code' => '519505', 'name' => 'Papeleria y utiles',                'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5195'],
            ['code' => '519510', 'name' => 'Elementos de aseo',                 'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5195'],
            ['code' => '52',     'name' => 'OPERACIONALES DE VENTAS',           'level' => 2, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5'],
            ['code' => '5205',   'name' => 'GASTOS DE PERSONAL',                'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '52'],
            ['code' => '520506', 'name' => 'Sueldos de ventas',                 'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5205'],
            ['code' => '5295',   'name' => 'DIVERSOS DE VENTAS',                'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '52'],
            ['code' => '529505', 'name' => 'Comisiones',                        'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5295'],
            ['code' => '529510', 'name' => 'Publicidad',                        'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5295'],
            ['code' => '53',     'name' => 'NO OPERACIONALES',                  'level' => 2, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5'],
            ['code' => '5305',   'name' => 'FINANCIEROS',                       'level' => 3, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '53'],
            ['code' => '530505', 'name' => 'Gastos bancarios',                  'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5305'],
            ['code' => '530510', 'name' => 'Intereses bancarios',               'level' => 4, 'type' => 'gasto',    'nature' => 'debito', 'parent_code' => '5305'],

            // ======================= CLASE 6: COSTOS =======================
            ['code' => '6',      'name' => 'COSTOS DE VENTAS',                  'level' => 1, 'type' => 'costo',    'nature' => 'debito'],
            ['code' => '61',     'name' => 'COSTO DE VENTAS Y DE PRESTACION DE SERVICIOS', 'level' => 2, 'type' => 'costo', 'nature' => 'debito', 'parent_code' => '6'],
            ['code' => '6135',   'name' => 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'level' => 3, 'type' => 'costo', 'nature' => 'debito', 'parent_code' => '61'],
            ['code' => '613505', 'name' => 'Costo de ventas de mercancias',     'level' => 4, 'type' => 'costo',    'nature' => 'debito', 'parent_code' => '6135'],
            ['code' => '6155',   'name' => 'SERVICIOS',                         'level' => 3, 'type' => 'costo',    'nature' => 'debito', 'parent_code' => '61'],
            ['code' => '615505', 'name' => 'Costo de servicios prestados',      'level' => 4, 'type' => 'costo',    'nature' => 'debito', 'parent_code' => '6155'],
        ];
    }
}
