<?php

namespace App\Services\Accounting;

use App\Models\Voucher;
use App\Models\VoucherLine;
use App\Models\AccountingPeriod;
use App\Models\PucAccount;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class JournalEntryService
{
    public function __construct(
        private AccountBalanceService $balanceService
    ) {}

    /**
     * Crea un comprobante en estado borrador.
     *
     * @param  array{
     *   company_id: int,
     *   voucher_type: string,
     *   date: string,
     *   description: string,
     *   third_party_id?: int|null,
     *   cost_center_id?: int|null,
     *   currency_id?: int|null,
     *   exchange_rate?: float,
     *   source_type?: string|null,
     *   source_id?: int|null,
     *   notes?: string|null,
     *   created_by: int,
     *   lines: array<array{account_id: int, debit?: float, credit?: float, description?: string, third_party_id?: int, cost_center_id?: int, tax_base?: float, tax_rate?: float, tax_type?: string}>
     * } $data
     */
    public function create(array $data): Voucher
    {
        return DB::transaction(function () use ($data) {
            $period = $this->getOrCreatePeriod($data['company_id'], $data['date']);

            $voucher = Voucher::create([
                'company_id'     => $data['company_id'],
                'period_id'      => $period->id,
                'voucher_type'   => $data['voucher_type'],
                'date'           => $data['date'],
                'description'    => $data['description'],
                'third_party_id' => $data['third_party_id'] ?? null,
                'cost_center_id' => $data['cost_center_id'] ?? null,
                'currency_id'    => $data['currency_id'] ?? null,
                'exchange_rate'  => $data['exchange_rate'] ?? 1,
                'source_type'    => $data['source_type'] ?? null,
                'source_id'      => $data['source_id'] ?? null,
                'notes'          => $data['notes'] ?? null,
                'created_by'     => $data['created_by'],
                'status'         => 'draft',
            ]);

            $totalDebit  = 0;
            $totalCredit = 0;

            foreach ($data['lines'] as $lineNumber => $lineData) {
                $debit  = (float) ($lineData['debit'] ?? 0);
                $credit = (float) ($lineData['credit'] ?? 0);

                VoucherLine::create([
                    'voucher_id'     => $voucher->id,
                    'line_number'    => $lineNumber + 1,
                    'account_id'     => $lineData['account_id'],
                    'third_party_id' => $lineData['third_party_id'] ?? null,
                    'cost_center_id' => $lineData['cost_center_id'] ?? null,
                    'description'    => $lineData['description'] ?? null,
                    'debit'          => $debit,
                    'credit'         => $credit,
                    'tax_base'       => $lineData['tax_base'] ?? null,
                    'tax_rate'       => $lineData['tax_rate'] ?? null,
                    'tax_type'       => $lineData['tax_type'] ?? null,
                ]);

                $totalDebit  += $debit;
                $totalCredit += $credit;
            }

            $voucher->update([
                'total_debit'  => $totalDebit,
                'total_credit' => $totalCredit,
            ]);

            return $voucher->fresh(['lines']);
        });
    }

    /**
     * Publica un comprobante: valida balance y actualiza saldos.
     */
    public function post(Voucher $voucher, int $postedBy): Voucher
    {
        if ($voucher->isPosted()) {
            throw new RuntimeException('El comprobante ya fue contabilizado.');
        }

        if ($voucher->period->isClosed()) {
            throw new RuntimeException('No se puede contabilizar en un periodo cerrado.');
        }

        $totalDebit  = $voucher->lines->sum('debit');
        $totalCredit = $voucher->lines->sum('credit');

        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new RuntimeException(
                "El comprobante no balancea. Debito: {$totalDebit} | Credito: {$totalCredit}"
            );
        }

        return DB::transaction(function () use ($voucher, $postedBy, $totalDebit, $totalCredit) {
            $voucher->update([
                'status'        => 'posted',
                'posted_by'     => $postedBy,
                'posted_at'     => now(),
                'total_debit'   => $totalDebit,
                'total_credit'  => $totalCredit,
            ]);

            // Actualizar saldos en account_balances
            foreach ($voucher->lines as $line) {
                $this->balanceService->addMovement(
                    $voucher->company_id,
                    $line->account_id,
                    $voucher->period_id,
                    $line->debit,
                    $line->credit
                );
            }

            return $voucher;
        });
    }

    /**
     * Reversa un comprobante creando uno nuevo con los debitos/creditos invertidos.
     */
    public function reverse(Voucher $voucher, int $userId, string $reason): Voucher
    {
        if (!$voucher->isPosted()) {
            throw new RuntimeException('Solo se pueden reversar comprobantes contabilizados.');
        }

        $reversalLines = $voucher->lines->map(function ($line) {
            return [
                'account_id'     => $line->account_id,
                'third_party_id' => $line->third_party_id,
                'cost_center_id' => $line->cost_center_id,
                'description'    => 'Reversa: '.($line->description ?? ''),
                'debit'          => $line->credit,  // Invertir
                'credit'         => $line->debit,   // Invertir
                'tax_base'       => $line->tax_base,
                'tax_rate'       => $line->tax_rate,
                'tax_type'       => $line->tax_type,
            ];
        })->toArray();

        $reversal = $this->create([
            'company_id'   => $voucher->company_id,
            'voucher_type' => $voucher->voucher_type,
            'date'         => now()->format('Y-m-d'),
            'description'  => 'REVERSA: '.$voucher->full_number.' - '.$reason,
            'source_type'  => 'reversal',
            'source_id'    => $voucher->id,
            'created_by'   => $userId,
            'lines'        => $reversalLines,
        ]);

        $this->post($reversal, $userId);

        $voucher->update(['reversed_by' => $reversal->id, 'status' => 'reversed']);

        return $reversal;
    }

    /**
     * Obtiene o crea el periodo contable para una fecha dada.
     */
    private function getOrCreatePeriod(int $companyId, string $date): AccountingPeriod
    {
        $d     = \Carbon\Carbon::parse($date);
        $year  = (int) $d->year;
        $month = (int) $d->month;

        $period = AccountingPeriod::withoutGlobalScope('company')
            ->where('company_id', $companyId)
            ->where('year', $year)
            ->where('month', $month)
            ->first();

        if (!$period) {
            $period = AccountingPeriod::withoutGlobalScope('company')->create([
                'company_id' => $companyId,
                'year'       => $year,
                'month'      => $month,
                'name'       => $d->translatedFormat('F Y'),
                'start_date' => $d->startOfMonth()->format('Y-m-d'),
                'end_date'   => $d->endOfMonth()->format('Y-m-d'),
                'status'     => 'open',
            ]);
        }

        if ($period->isClosed()) {
            throw new RuntimeException("El periodo {$period->name} esta cerrado.");
        }

        return $period;
    }
}
