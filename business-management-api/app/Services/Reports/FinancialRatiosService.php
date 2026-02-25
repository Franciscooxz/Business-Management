<?php

namespace App\Services\Reports;

class FinancialRatiosService
{
    public function __construct(
        private readonly BalanceSheetService   $balanceSheet,
        private readonly IncomeStatementService $incomeStatement,
    ) {}

    /**
     * Calcula los indicadores financieros clave.
     */
    public function calculate(int $companyId, string $startDate, string $endDate): array
    {
        $bs  = $this->balanceSheet->generate($companyId, $endDate, $startDate);
        $pag = $this->incomeStatement->generate($companyId, $startDate, $endDate);

        // ── Datos del Balance ─────────────────────────────────────────────────
        $activoCorriente    = $bs['activo']['corriente']['total'];
        $activoNoCorriente  = $bs['activo']['no_corriente']['total'];
        $totalActivo        = $bs['activo']['total'];

        $pasivoCorriente    = $bs['pasivo']['corriente']['total'];
        $pasivoNoCorriente  = $bs['pasivo']['no_corriente']['total'];
        $totalPasivo        = $bs['pasivo']['total'];

        $totalPatrimonio    = $bs['patrimonio']['total'];

        // Inventarios (code 14xx)
        $inventarios = collect($bs['activo']['corriente']['accounts'])
            ->filter(fn ($a) => str_starts_with($a['code'], '14'))
            ->sum('balance');

        // ── Datos del P&G ─────────────────────────────────────────────────────
        $totalIngresos    = $pag['total_ingresos'];
        $utilidadBruta    = $pag['utilidad_bruta'];
        $utilidadOp       = $pag['utilidad_operacional'];
        $utilidadNeta     = $pag['utilidad_neta'];
        $ebitda           = $pag['ebitda'];
        $costoVentas      = $pag['costo_ventas']['total'];

        // ── Calcular ratios ───────────────────────────────────────────────────
        $safe = fn ($n, $d) => $d != 0 ? round($n / $d, 4) : null;

        $liquidezCorriente = $safe($activoCorriente, $pasivoCorriente);
        $razonAcida        = $safe($activoCorriente - $inventarios, $pasivoCorriente);
        $capitalTrabajo    = round($activoCorriente - $pasivoCorriente, 2);

        $endeudamiento     = $safe($totalPasivo, $totalActivo);
        $apalancamiento    = $safe($totalPasivo, $totalPatrimonio);

        $roa               = $safe($utilidadNeta, $totalActivo);
        $roe               = $safe($utilidadNeta, $totalPatrimonio);

        $margenBruto       = $safe($utilidadBruta, $totalIngresos);
        $margenOperacional = $safe($utilidadOp,    $totalIngresos);
        $margenNeto        = $safe($utilidadNeta,  $totalIngresos);

        // Rotación de cartera: CxC / (Ingresos / 360)  → días
        $cxc = collect($bs['activo']['corriente']['accounts'])
            ->filter(fn ($a) => str_starts_with($a['code'], '13'))
            ->sum('balance');
        $rotacionCartera = ($totalIngresos > 0 && $cxc > 0)
            ? round($cxc / ($totalIngresos / 360))
            : null;

        // Rotación de inventarios: Inventarios / (Costo de ventas / 360) → días
        $rotacionInventarios = ($costoVentas > 0 && $inventarios > 0)
            ? round($inventarios / ($costoVentas / 360))
            : null;

        return [
            'period'       => ['start' => $startDate, 'end' => $endDate],

            // Liquidez
            'liquidez_corriente'  => $liquidezCorriente,
            'razon_acida'         => $razonAcida,
            'capital_trabajo'     => $capitalTrabajo,

            // Endeudamiento
            'endeudamiento'       => $endeudamiento,
            'apalancamiento'      => $apalancamiento,

            // Rentabilidad
            'roa'                 => $roa,
            'roe'                 => $roe,
            'margen_bruto'        => $margenBruto,
            'margen_operacional'  => $margenOperacional,
            'margen_neto'         => $margenNeto,
            'ebitda'              => $ebitda,

            // Actividad
            'rotacion_cartera'    => $rotacionCartera,     // días
            'rotacion_inventarios'=> $rotacionInventarios, // días

            // Resumen de cifras base
            'summary' => [
                'total_activo'        => round($totalActivo,     2),
                'total_pasivo'        => round($totalPasivo,     2),
                'total_patrimonio'    => round($totalPatrimonio, 2),
                'activo_corriente'    => round($activoCorriente, 2),
                'pasivo_corriente'    => round($pasivoCorriente, 2),
                'total_ingresos'      => round($totalIngresos,   2),
                'utilidad_neta'       => round($utilidadNeta,    2),
                'inventarios'         => round($inventarios,     2),
                'cxc'                 => round($cxc,             2),
            ],
        ];
    }
}
