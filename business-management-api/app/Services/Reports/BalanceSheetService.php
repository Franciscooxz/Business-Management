<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class BalanceSheetService
{
    // ── Clasificación corriente / no corriente por prefijo de cuenta PUC ──────
    // Activo corriente: disponible (11), inversiones (12), CxC (13), inventarios (14)
    // Activo no corriente: PP&E (15), intangibles (16), diferidos (17), otros (18+)
    private const CURRENT_ASSET_PREFIXES     = ['11', '12', '13', '14'];
    private const CURRENT_LIABILITY_PREFIXES = ['21', '22', '23', '24', '25'];

    /**
     * Genera el Balance General.
     *
     * Para cuentas de balance (activo, pasivo, patrimonio):
     *   → movimientos ACUMULADOS desde el inicio hasta $asOfDate
     * Para cuentas de resultado (ingreso, gasto, costo):
     *   → movimientos del período ($periodStart a $asOfDate)
     *   → el neto se incluye como "Resultado del Período" en Patrimonio
     */
    public function generate(
        int    $companyId,
        string $asOfDate,
        string $periodStart
    ): array {
        // ── Saldos acumulados de balance ──────────────────────────────────────
        $balanceRows = $this->queryBalances(
            $companyId,
            ['activo', 'pasivo', 'patrimonio'],
            '1900-01-01',
            $asOfDate
        );

        // ── Resultado del período (ingresos - costos - gastos) ────────────────
        $resultRows = $this->queryBalances(
            $companyId,
            ['ingreso', 'gasto', 'costo'],
            $periodStart,
            $asOfDate
        );

        $netIncome = $this->calcNetIncome($resultRows);

        // ── Construir secciones ───────────────────────────────────────────────
        $activos    = $this->buildSection($balanceRows, 'activo');
        $pasivos    = $this->buildSection($balanceRows, 'pasivo');
        $patrimonio = $this->buildSection($balanceRows, 'patrimonio');

        // Corriente / No corriente
        [$activoCorriente,    $activoNoCorriente]   = $this->splitCurrentNonCurrent($activos, self::CURRENT_ASSET_PREFIXES);
        [$pasivoCorriente,    $pasivoNoCorriente]    = $this->splitCurrentNonCurrent($pasivos, self::CURRENT_LIABILITY_PREFIXES);

        $totalActivo     = round($activoCorriente['total']    + $activoNoCorriente['total'],    2);
        $totalPasivo     = round($pasivoCorriente['total']    + $pasivoNoCorriente['total'],    2);
        $totalPatrimonio = round($patrimonio['total']         + $netIncome,                      2);

        return [
            'as_of_date'    => $asOfDate,
            'period_start'  => $periodStart,

            'activo' => [
                'corriente'     => $activoCorriente,
                'no_corriente'  => $activoNoCorriente,
                'total'         => $totalActivo,
            ],
            'pasivo' => [
                'corriente'     => $pasivoCorriente,
                'no_corriente'  => $pasivoNoCorriente,
                'total'         => $totalPasivo,
            ],
            'patrimonio' => [
                'accounts'        => $patrimonio['accounts'],
                'net_income'      => round($netIncome, 2),
                'total'           => $totalPatrimonio,
            ],

            'total_pasivo_patrimonio' => round($totalPasivo + $totalPatrimonio, 2),
            'is_balanced'             => abs($totalActivo - ($totalPasivo + $totalPatrimonio)) < 1,
            'difference'              => round(abs($totalActivo - ($totalPasivo + $totalPatrimonio)), 2),
        ];
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private function queryBalances(int $companyId, array $types, string $start, string $end): Collection
    {
        return DB::table('voucher_lines as vl')
            ->join('vouchers as v',      'vl.voucher_id', '=', 'v.id')
            ->join('puc_accounts as pa', 'vl.account_id', '=', 'pa.id')
            ->where('v.company_id',    $companyId)
            ->where('v.status',        'posted')
            ->whereBetween('v.date',   [$start, $end])
            ->whereIn('pa.type',       $types)
            ->selectRaw('
                pa.id, pa.code, pa.name, pa.type, pa.nature, pa.level,
                SUM(vl.debit)  as total_debit,
                SUM(vl.credit) as total_credit
            ')
            ->groupBy('pa.id', 'pa.code', 'pa.name', 'pa.type', 'pa.nature', 'pa.level')
            ->orderBy('pa.code')
            ->get();
    }

    private function buildSection(Collection $rows, string $type): array
    {
        $accounts = $rows->where('type', $type)->map(function ($row) {
            $balance = ($row->nature === 'debito')
                ? (float) $row->total_debit  - (float) $row->total_credit
                : (float) $row->total_credit - (float) $row->total_debit;

            return [
                'code'    => $row->code,
                'name'    => $row->name,
                'level'   => $row->level,
                'balance' => round($balance, 2),
            ];
        })->values()->toArray();

        return [
            'accounts' => $accounts,
            'total'    => round(array_sum(array_column($accounts, 'balance')), 2),
        ];
    }

    private function splitCurrentNonCurrent(array $section, array $currentPrefixes): array
    {
        $current    = ['accounts' => [], 'total' => 0.0];
        $nonCurrent = ['accounts' => [], 'total' => 0.0];

        foreach ($section['accounts'] as $account) {
            $isCurrent = false;
            foreach ($currentPrefixes as $prefix) {
                if (str_starts_with($account['code'], $prefix)) {
                    $isCurrent = true;
                    break;
                }
            }

            if ($isCurrent) {
                $current['accounts'][] = $account;
                $current['total']     += $account['balance'];
            } else {
                $nonCurrent['accounts'][] = $account;
                $nonCurrent['total']      += $account['balance'];
            }
        }

        $current['total']    = round($current['total'],    2);
        $nonCurrent['total'] = round($nonCurrent['total'], 2);

        return [$current, $nonCurrent];
    }

    private function calcNetIncome(Collection $rows): float
    {
        $ingresos = $rows->where('type', 'ingreso')->sum(fn ($r) =>
            ($r->nature === 'credito')
                ? (float)$r->total_credit - (float)$r->total_debit
                : (float)$r->total_debit  - (float)$r->total_credit
        );

        $egresos = $rows->whereIn('type', ['gasto', 'costo'])->sum(fn ($r) =>
            ($r->nature === 'debito')
                ? (float)$r->total_debit  - (float)$r->total_credit
                : (float)$r->total_credit - (float)$r->total_debit
        );

        return round($ingresos - $egresos, 2);
    }
}
