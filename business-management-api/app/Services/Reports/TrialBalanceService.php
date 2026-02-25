<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\DB;

class TrialBalanceService
{
    /**
     * Genera el Balance de Prueba (Balanza de Comprobación).
     * Agrega los movimientos de comprobantes PUBLICADOS por cuenta PUC en el período.
     *
     * @param  bool $onlyWithMovements  true = omite cuentas con saldo 0
     */
    public function generate(
        int    $companyId,
        string $startDate,
        string $endDate,
        bool   $onlyWithMovements = true
    ): array {
        $rows = DB::table('voucher_lines as vl')
            ->join('vouchers as v',      'vl.voucher_id',  '=', 'v.id')
            ->join('puc_accounts as pa', 'vl.account_id',  '=', 'pa.id')
            ->where('v.company_id',  $companyId)
            ->where('v.status',      'posted')
            ->whereBetween('v.date', [$startDate, $endDate])
            ->selectRaw('
                pa.id,
                pa.code,
                pa.name,
                pa.type,
                pa.nature,
                pa.level,
                SUM(vl.debit)   as total_debit,
                SUM(vl.credit)  as total_credit
            ')
            ->groupBy('pa.id', 'pa.code', 'pa.name', 'pa.type', 'pa.nature', 'pa.level')
            ->orderBy('pa.code')
            ->get();

        $result = $rows->map(function ($row) {
            $balance = ($row->nature === 'debito')
                ? (float) $row->total_debit  - (float) $row->total_credit
                : (float) $row->total_credit - (float) $row->total_debit;

            return [
                'id'           => $row->id,
                'code'         => $row->code,
                'name'         => $row->name,
                'type'         => $row->type,
                'nature'       => $row->nature,
                'level'        => $row->level,
                'total_debit'  => round((float) $row->total_debit,  2),
                'total_credit' => round((float) $row->total_credit, 2),
                'balance'      => round($balance, 2),
            ];
        });

        if ($onlyWithMovements) {
            $result = $result->filter(fn ($r) => $r['total_debit'] > 0 || $r['total_credit'] > 0);
        }

        $result      = $result->values()->toArray();
        $totalDebit  = round(array_sum(array_column($result, 'total_debit')),  2);
        $totalCredit = round(array_sum(array_column($result, 'total_credit')), 2);

        return [
            'rows'         => $result,
            'total_debit'  => $totalDebit,
            'total_credit' => $totalCredit,
            'difference'   => round(abs($totalDebit - $totalCredit), 4),
            'is_balanced'  => abs($totalDebit - $totalCredit) < 0.01,
            'start_date'   => $startDate,
            'end_date'     => $endDate,
        ];
    }
}
