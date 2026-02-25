<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\DB;

class IncomeStatementService
{
    /**
     * Genera el Estado de Resultados (P&G).
     *
     * Estructura colombiana:
     *   Ingresos Operacionales          (type=ingreso, code 41xx)
     *   Ingresos No Operacionales       (type=ingreso, code 42xx+)
     * - Costo de Ventas                 (type=costo,   code 6xxx)
     * = Utilidad Bruta
     * - Gastos Operacionales            (type=gasto,   code 51xx-53xx)
     * = Utilidad Operacional (EBIT)
     * - Gastos No Operacionales         (type=gasto,   code 58xx-59xx)
     * - Impuesto de Renta               (type=gasto,   code 54xx)
     * = Utilidad Neta
     */
    public function generate(int $companyId, string $startDate, string $endDate): array
    {
        $rows = DB::table('voucher_lines as vl')
            ->join('vouchers as v',      'vl.voucher_id', '=', 'v.id')
            ->join('puc_accounts as pa', 'vl.account_id', '=', 'pa.id')
            ->where('v.company_id',  $companyId)
            ->where('v.status',      'posted')
            ->whereBetween('v.date', [$startDate, $endDate])
            ->whereIn('pa.type', ['ingreso', 'gasto', 'costo'])
            ->selectRaw('
                pa.id, pa.code, pa.name, pa.type, pa.nature, pa.level,
                SUM(vl.debit)  as total_debit,
                SUM(vl.credit) as total_credit
            ')
            ->groupBy('pa.id', 'pa.code', 'pa.name', 'pa.type', 'pa.nature', 'pa.level')
            ->orderBy('pa.code')
            ->get();

        // Calcular saldo neto de cada cuenta
        $accounts = $rows->map(function ($row) {
            $balance = ($row->nature === 'debito')
                ? (float) $row->total_debit  - (float) $row->total_credit
                : (float) $row->total_credit - (float) $row->total_debit;

            return [
                'id'      => $row->id,
                'code'    => $row->code,
                'name'    => $row->name,
                'type'    => $row->type,
                'nature'  => $row->nature,
                'level'   => $row->level,
                'balance' => round($balance, 2),
            ];
        });

        // ── Clasificar por sección ────────────────────────────────────────────

        $ingresosOp    = $accounts->filter(fn ($a) => $a['type'] === 'ingreso' && str_starts_with($a['code'], '41'));
        $ingresosNoOp  = $accounts->filter(fn ($a) => $a['type'] === 'ingreso' && !str_starts_with($a['code'], '41'));
        $costos        = $accounts->filter(fn ($a) => $a['type'] === 'costo');
        $gastosOp      = $accounts->filter(fn ($a) => $a['type'] === 'gasto'  && preg_match('/^5[1-3]/', $a['code']));
        $gastosImpuesto= $accounts->filter(fn ($a) => $a['type'] === 'gasto'  && str_starts_with($a['code'], '54'));
        $gastosNoOp    = $accounts->filter(fn ($a) => $a['type'] === 'gasto'  && preg_match('/^5[5-9]|^6[^0]/', $a['code'])
                                                    && !str_starts_with($a['code'], '54'));

        // ── Subtotales ────────────────────────────────────────────────────────
        $totalIngresosOp   = round($ingresosOp->sum('balance'),   2);
        $totalIngresosNoOp = round($ingresosNoOp->sum('balance'),  2);
        $totalIngresos     = round($totalIngresosOp + $totalIngresosNoOp, 2);
        $totalCostos       = round($costos->sum('balance'),        2);
        $utilidadBruta     = round($totalIngresos - $totalCostos,  2);
        $totalGastosOp     = round($gastosOp->sum('balance'),      2);
        $utilidadOperacional = round($utilidadBruta - $totalGastosOp, 2);
        $totalGastosNoOp   = round($gastosNoOp->sum('balance'),    2);
        $utilidadAntesImp  = round($utilidadOperacional - $totalGastosNoOp, 2);
        $totalImpuesto     = round($gastosImpuesto->sum('balance'), 2);
        $utilidadNeta      = round($utilidadAntesImp - $totalImpuesto, 2);

        // ── EBITDA (aproximado: utilidad operacional + depreciaciones 159xx) ─
        $depreciaciones = $accounts->filter(fn ($a) => str_starts_with($a['code'], '159') || str_starts_with($a['code'], '1599'))->sum('balance');
        $ebitda         = round($utilidadOperacional + abs($depreciaciones), 2);

        return [
            'start_date'          => $startDate,
            'end_date'            => $endDate,

            'ingresos_operacionales' => [
                'accounts' => $ingresosOp->values()->toArray(),
                'total'    => $totalIngresosOp,
            ],
            'ingresos_no_operacionales' => [
                'accounts' => $ingresosNoOp->values()->toArray(),
                'total'    => $totalIngresosNoOp,
            ],
            'total_ingresos'      => $totalIngresos,

            'costo_ventas' => [
                'accounts' => $costos->values()->toArray(),
                'total'    => $totalCostos,
            ],

            'utilidad_bruta'      => $utilidadBruta,
            'margen_bruto_pct'    => $totalIngresos > 0 ? round($utilidadBruta / $totalIngresos * 100, 2) : 0,

            'gastos_operacionales' => [
                'accounts' => $gastosOp->values()->toArray(),
                'total'    => $totalGastosOp,
            ],

            'utilidad_operacional' => $utilidadOperacional,
            'ebitda'               => $ebitda,
            'margen_operacional_pct' => $totalIngresos > 0 ? round($utilidadOperacional / $totalIngresos * 100, 2) : 0,

            'gastos_no_operacionales' => [
                'accounts' => $gastosNoOp->values()->toArray(),
                'total'    => $totalGastosNoOp,
            ],

            'utilidad_antes_impuesto' => $utilidadAntesImp,

            'impuesto_renta' => [
                'accounts' => $gastosImpuesto->values()->toArray(),
                'total'    => $totalImpuesto,
            ],

            'utilidad_neta'       => $utilidadNeta,
            'margen_neto_pct'     => $totalIngresos > 0 ? round($utilidadNeta / $totalIngresos * 100, 2) : 0,
        ];
    }
}
