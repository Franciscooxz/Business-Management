<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\DB;

class LedgerService
{
    /**
     * Libro Mayor de una cuenta PUC.
     * Retorna cada movimiento con saldo acumulado.
     */
    public function getLedger(
        int    $companyId,
        int    $accountId,
        string $startDate,
        string $endDate
    ): array {
        // Saldo anterior (todo lo anterior a startDate)
        $opening = DB::table('voucher_lines as vl')
            ->join('vouchers as v', 'vl.voucher_id', '=', 'v.id')
            ->where('v.company_id', $companyId)
            ->where('v.status',     'posted')
            ->where('vl.account_id', $accountId)
            ->where('v.date', '<', $startDate)
            ->selectRaw('COALESCE(SUM(vl.debit),0) as d, COALESCE(SUM(vl.credit),0) as c')
            ->first();

        $account = DB::table('puc_accounts')->where('id', $accountId)->first();
        $nature  = $account?->nature ?? 'debito';

        $openingBalance = ($nature === 'debito')
            ? (float)$opening->d - (float)$opening->c
            : (float)$opening->c - (float)$opening->d;

        // Movimientos del período
        $lines = DB::table('voucher_lines as vl')
            ->join('vouchers as v',      'vl.voucher_id',  '=', 'v.id')
            ->leftJoin('third_parties as tp', 'vl.third_party_id', '=', 'tp.id')
            ->where('v.company_id',  $companyId)
            ->where('v.status',      'posted')
            ->where('vl.account_id', $accountId)
            ->whereBetween('v.date', [$startDate, $endDate])
            ->select(
                'v.date',
                'v.full_number',
                'v.voucher_type',
                DB::raw("COALESCE(vl.description, v.description) as description"),
                'vl.debit',
                'vl.credit',
                DB::raw("COALESCE(tp.name, tp.company_name) as third_party_name")
            )
            ->orderBy('v.date')
            ->orderBy('v.full_number')
            ->get();

        $runningBalance = $openingBalance;
        $movements      = [];

        foreach ($lines as $line) {
            if ($nature === 'debito') {
                $runningBalance += (float)$line->debit - (float)$line->credit;
            } else {
                $runningBalance += (float)$line->credit - (float)$line->debit;
            }

            $movements[] = [
                'date'             => $line->date,
                'full_number'      => $line->full_number,
                'voucher_type'     => $line->voucher_type,
                'description'      => $line->description,
                'third_party_name' => $line->third_party_name,
                'debit'            => round((float)$line->debit,  2),
                'credit'           => round((float)$line->credit, 2),
                'balance'          => round($runningBalance,       2),
            ];
        }

        $totalDebit  = round(array_sum(array_column($movements, 'debit')),  2);
        $totalCredit = round(array_sum(array_column($movements, 'credit')), 2);

        return [
            'account'         => [
                'id'     => $account?->id,
                'code'   => $account?->code,
                'name'   => $account?->name,
                'nature' => $nature,
            ],
            'opening_balance' => round($openingBalance, 2),
            'movements'       => $movements,
            'total_debit'     => $totalDebit,
            'total_credit'    => $totalCredit,
            'closing_balance' => round($runningBalance, 2),
            'start_date'      => $startDate,
            'end_date'        => $endDate,
        ];
    }

    /**
     * Libro Diario: todos los comprobantes PUBLICADOS en el período, con sus líneas.
     */
    public function getJournal(
        int     $companyId,
        string  $startDate,
        string  $endDate,
        ?string $voucherType = null,
        ?string $search      = null
    ): array {
        $query = DB::table('vouchers as v')
            ->leftJoin('third_parties as tp', 'v.third_party_id', '=', 'tp.id')
            ->where('v.company_id', $companyId)
            ->where('v.status',     'posted')
            ->whereBetween('v.date', [$startDate, $endDate]);

        if ($voucherType) { $query->where('v.voucher_type', $voucherType); }
        if ($search)      {
            $query->where(fn ($q) =>
                $q->where('v.full_number', 'like', "%{$search}%")
                  ->orWhere('v.description', 'like', "%{$search}%")
            );
        }

        $vouchers = $query
            ->select('v.id', 'v.date', 'v.full_number', 'v.voucher_type',
                     'v.description', 'v.total_debit', 'v.total_credit',
                     DB::raw("COALESCE(tp.name, tp.company_name) as third_party_name"))
            ->orderBy('v.date')
            ->orderBy('v.full_number')
            ->paginate(50);

        // Cargar líneas para la página actual
        $voucherIds = collect($vouchers->items())->pluck('id');
        $lines = DB::table('voucher_lines as vl')
            ->join('puc_accounts as pa', 'vl.account_id', '=', 'pa.id')
            ->leftJoin('third_parties as tp', 'vl.third_party_id', '=', 'tp.id')
            ->whereIn('vl.voucher_id', $voucherIds)
            ->select('vl.voucher_id', 'vl.line_number', 'pa.code', 'pa.name',
                     'vl.description', 'vl.debit', 'vl.credit',
                     DB::raw("COALESCE(tp.name, tp.company_name) as third_party_name"))
            ->orderBy('vl.voucher_id')
            ->orderBy('vl.line_number')
            ->get()
            ->groupBy('voucher_id');

        $items = collect($vouchers->items())->map(function ($v) use ($lines) {
            return array_merge((array)$v, [
                'lines' => ($lines->get($v->id) ?? collect())->toArray(),
            ]);
        })->toArray();

        return [
            'data'       => $items,
            'meta'       => [
                'current_page' => $vouchers->currentPage(),
                'last_page'    => $vouchers->lastPage(),
                'total'        => $vouchers->total(),
                'per_page'     => $vouchers->perPage(),
            ],
            'start_date' => $startDate,
            'end_date'   => $endDate,
        ];
    }
}
