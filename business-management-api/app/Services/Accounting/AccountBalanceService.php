<?php

namespace App\Services\Accounting;

use App\Models\AccountBalance;
use App\Models\PucAccount;
use Illuminate\Support\Facades\DB;

class AccountBalanceService
{
    /**
     * Agrega un movimiento a account_balances para una cuenta y periodo.
     */
    public function addMovement(int $companyId, int $accountId, int $periodId, float $debit, float $credit): void
    {
        AccountBalance::updateOrCreate(
            [
                'company_id' => $companyId,
                'account_id' => $accountId,
                'period_id'  => $periodId,
            ],
            []
        );

        AccountBalance::where('company_id', $companyId)
            ->where('account_id', $accountId)
            ->where('period_id', $periodId)
            ->update([
                'period_debit'   => DB::raw("period_debit + {$debit}"),
                'period_credit'  => DB::raw("period_credit + {$credit}"),
                'closing_debit'  => DB::raw("closing_debit + {$debit}"),
                'closing_credit' => DB::raw("closing_credit + {$credit}"),
            ]);

        // Actualizar balance acumulado en puc_accounts (desnormalizado)
        PucAccount::where('id', $accountId)->update([
            'balance_debit'  => DB::raw("balance_debit + {$debit}"),
            'balance_credit' => DB::raw("balance_credit + {$credit}"),
        ]);
    }
}
