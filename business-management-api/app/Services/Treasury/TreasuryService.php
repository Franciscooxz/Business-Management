<?php

namespace App\Services\Treasury;

use App\Models\AccountPayable;
use App\Models\AccountReceivable;
use App\Models\ApPayment;
use App\Models\ArPayment;
use App\Models\BankAccount;
use App\Models\TreasuryMovement;
use App\Models\Voucher;
use App\Models\VoucherLine;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TreasuryService
{
    /**
     * Registra un movimiento de tesorería y genera el comprobante contable.
     *
     * @param  array  $data  Campos validados del movimiento
     * @return TreasuryMovement
     */
    public function registerMovement(array $data): TreasuryMovement
    {
        return DB::transaction(function () use ($data) {
            // 1. Calcular neto (descontando retenciones)
            $retenciones = ($data['retention_retefuente'] ?? 0)
                         + ($data['retention_reteiva']    ?? 0)
                         + ($data['retention_reteica']    ?? 0);
            $data['net_amount'] = $data['amount'] - $retenciones;
            $data['created_by'] = Auth::id();

            // 2. Crear el movimiento
            $movement = TreasuryMovement::create($data);

            // 3. Actualizar saldo de la cuenta origen
            $account = BankAccount::lockForUpdate()->find($data['bank_account_id']);
            if ($data['type'] === 'ingreso') {
                $account->increment('current_balance', $data['net_amount']);
            } elseif ($data['type'] === 'egreso') {
                $account->decrement('current_balance', $data['net_amount']);
            } elseif ($data['type'] === 'traslado') {
                $account->decrement('current_balance', $data['amount']);
                // Acreditar cuenta destino
                $dest = BankAccount::lockForUpdate()->find($data['destination_account_id']);
                $dest->increment('current_balance', $data['amount']);
            }

            // 4. Generar comprobante contable automático
            try {
                $voucher = $this->generateVoucher($movement, $account);
                if ($voucher) {
                    $movement->update(['voucher_id' => $voucher->id]);
                }
            } catch (\Exception $e) {
                Log::warning('TreasuryService: no se pudo generar comprobante', [
                    'movement_id' => $movement->id,
                    'error'       => $e->getMessage(),
                ]);
            }

            return $movement->fresh(['bankAccount', 'thirdParty', 'voucher']);
        });
    }

    /**
     * Aplica un pago a una Cuenta por Cobrar.
     * Crea el movimiento de tesorería + el registro ArPayment + actualiza la CxC.
     */
    public function applyArPayment(AccountReceivable $ar, array $data): TreasuryMovement
    {
        return DB::transaction(function () use ($ar, $data) {
            if ($data['amount'] > $ar->pending_amount) {
                throw new \InvalidArgumentException(
                    "El pago ({$data['amount']}) supera el saldo pendiente ({$ar->pending_amount})."
                );
            }

            // Movimiento de tesorería
            $movement = $this->registerMovement(array_merge($data, [
                'type'           => 'ingreso',
                'concept'        => 'cobro_cliente',
                'source_type'    => 'accounts_receivable',
                'source_id'      => $ar->id,
                'third_party_id' => $ar->third_party_id,
            ]));

            // Registro de pago contra la CxC
            ArPayment::create([
                'company_id'              => $ar->company_id,
                'accounts_receivable_id'  => $ar->id,
                'treasury_movement_id'    => $movement->id,
                'amount'                  => $data['amount'],
                'payment_date'            => $data['movement_date'],
                'notes'                   => $data['description'] ?? null,
            ]);

            // Actualizar saldos y estado de la CxC
            $ar->paid_amount = (float)$ar->paid_amount + (float)$data['amount'];
            $ar->recalculate();

            return $movement;
        });
    }

    /**
     * Aplica un pago a una Cuenta por Pagar.
     */
    public function applyApPayment(AccountPayable $ap, array $data): TreasuryMovement
    {
        return DB::transaction(function () use ($ap, $data) {
            if ($data['amount'] > $ap->pending_amount) {
                throw new \InvalidArgumentException(
                    "El pago ({$data['amount']}) supera el saldo pendiente ({$ap->pending_amount})."
                );
            }

            $movement = $this->registerMovement(array_merge($data, [
                'type'           => 'egreso',
                'concept'        => 'pago_proveedor',
                'source_type'    => 'accounts_payable',
                'source_id'      => $ap->id,
                'third_party_id' => $ap->third_party_id,
            ]));

            ApPayment::create([
                'company_id'           => $ap->company_id,
                'accounts_payable_id'  => $ap->id,
                'treasury_movement_id' => $movement->id,
                'amount'               => $data['amount'],
                'payment_date'         => $data['movement_date'],
                'notes'                => $data['description'] ?? null,
            ]);

            $ap->paid_amount = (float)$ap->paid_amount + (float)$data['amount'];
            $ap->recalculate();

            return $movement;
        });
    }

    /**
     * Anula un movimiento y revierte el saldo de la cuenta.
     */
    public function reverseMovement(TreasuryMovement $movement): TreasuryMovement
    {
        if ($movement->status === 'anulado') {
            throw new \RuntimeException('El movimiento ya está anulado.');
        }

        return DB::transaction(function () use ($movement) {
            // Revertir saldo
            $account = BankAccount::lockForUpdate()->find($movement->bank_account_id);
            if ($movement->type === 'ingreso') {
                $account->decrement('current_balance', $movement->net_amount);
            } elseif ($movement->type === 'egreso') {
                $account->increment('current_balance', $movement->net_amount);
            } elseif ($movement->type === 'traslado') {
                $account->increment('current_balance', $movement->amount);
                $dest = BankAccount::lockForUpdate()->find($movement->destination_account_id);
                $dest->decrement('current_balance', $movement->amount);
            }

            $movement->update(['status' => 'anulado']);

            // Si había CxC/CxP, reversar el pago
            if ($movement->arPayment) {
                $ar = $movement->arPayment->accountReceivable;
                $ar->paid_amount = max(0, (float)$ar->paid_amount - (float)$movement->arPayment->amount);
                $ar->recalculate();
            }
            if ($movement->apPayment) {
                $ap = $movement->apPayment->accountPayable;
                $ap->paid_amount = max(0, (float)$ap->paid_amount - (float)$movement->apPayment->amount);
                $ap->recalculate();
            }

            return $movement->fresh();
        });
    }

    /**
     * Genera un resumen de flujo de caja (real + proyectado).
     *
     * @param  string  $from  Fecha inicio (Y-m-d)
     * @param  string  $to    Fecha fin (Y-m-d)
     */
    public function getCashFlow(string $from, string $to): array
    {
        // Movimientos reales en el período
        $movements = TreasuryMovement::where('status', 'aplicado')
            ->whereBetween('movement_date', [$from, $to])
            ->selectRaw("
                movement_date,
                SUM(CASE WHEN type = 'ingreso' THEN net_amount ELSE 0 END) as ingresos,
                SUM(CASE WHEN type = 'egreso'  THEN net_amount ELSE 0 END) as egresos
            ")
            ->groupBy('movement_date')
            ->orderBy('movement_date')
            ->get();

        // CxC por vencer en el período (proyección de ingresos)
        $arProjection = AccountReceivable::whereIn('status', ['pendiente', 'parcial'])
            ->whereBetween('due_date', [$from, $to])
            ->selectRaw("due_date as fecha, SUM(pending_amount) as monto")
            ->groupBy('due_date')
            ->orderBy('due_date')
            ->get();

        // CxP por vencer en el período (proyección de egresos)
        $apProjection = AccountPayable::whereIn('status', ['pendiente', 'parcial'])
            ->whereBetween('due_date', [$from, $to])
            ->selectRaw("due_date as fecha, SUM(pending_amount) as monto")
            ->groupBy('due_date')
            ->orderBy('due_date')
            ->get();

        // Saldos actuales de todas las cuentas
        $bankBalances = BankAccount::active()
            ->select('id', 'name', 'type', 'current_balance', 'currency')
            ->get();

        return [
            'movements'      => $movements,
            'ar_projection'  => $arProjection,
            'ap_projection'  => $apProjection,
            'bank_balances'  => $bankBalances,
            'total_balance'  => $bankBalances->sum('current_balance'),
            'total_ar_pending' => AccountReceivable::whereIn('status', ['pendiente', 'parcial'])->sum('pending_amount'),
            'total_ap_pending' => AccountPayable::whereIn('status', ['pendiente', 'parcial'])->sum('pending_amount'),
        ];
    }

    // ── Generación de comprobante contable ───────────────────────────────────

    /**
     * Genera automáticamente el comprobante contable (partida doble)
     * para un movimiento de tesorería.
     *
     * Lógica básica:
     *  - Ingreso:  Db cuenta banco / Cr cuenta cliente/ingreso
     *  - Egreso:   Db cuenta proveedor/gasto / Cr cuenta banco
     *  - Traslado: Db cuenta banco destino / Cr cuenta banco origen
     */
    private function generateVoucher(TreasuryMovement $movement, BankAccount $account): ?Voucher
    {
        // Solo generar si la cuenta bancaria tiene PUC vinculado
        if (!$account->puc_account_id) {
            return null;
        }

        $voucherType = match($movement->type) {
            'ingreso'  => 'CI', // Comprobante de Ingreso
            'egreso'   => 'CE', // Comprobante de Egreso
            'traslado' => 'CD', // Comprobante de Diario
            default    => 'CD',
        };

        $voucher = Voucher::create([
            'company_id'  => $movement->company_id,
            'type'        => $voucherType,
            'date'        => $movement->movement_date,
            'description' => $movement->description
                ?? ($movement->concept_label . ' - ' . ($movement->reference ?? '')),
            'status'      => 'draft',
            'created_by'  => $movement->created_by,
        ]);

        $lines = [];

        if ($movement->type === 'ingreso') {
            // Débito: cuenta bancaria (activo aumenta al debitar)
            $lines[] = [
                'voucher_id'      => $voucher->id,
                'puc_account_id'  => $account->puc_account_id,
                'third_party_id'  => $movement->third_party_id,
                'description'     => $movement->concept_label,
                'debit'           => $movement->net_amount,
                'credit'          => 0,
            ];
            // Crédito: cuenta de ingreso genérica (se completa si hay PUC de la CxC)
            // Por ahora solo se crea el débito; el contador puede completar el crédito
        } elseif ($movement->type === 'egreso') {
            // Crédito: cuenta bancaria (activo disminuye al acreditar)
            $lines[] = [
                'voucher_id'      => $voucher->id,
                'puc_account_id'  => $account->puc_account_id,
                'third_party_id'  => $movement->third_party_id,
                'description'     => $movement->concept_label,
                'debit'           => 0,
                'credit'          => $movement->net_amount,
            ];
        } elseif ($movement->type === 'traslado' && $movement->destination_account_id) {
            $dest = BankAccount::find($movement->destination_account_id);
            if ($dest?->puc_account_id) {
                // Débito destino
                $lines[] = [
                    'voucher_id'     => $voucher->id,
                    'puc_account_id' => $dest->puc_account_id,
                    'description'    => "Traslado desde {$account->name}",
                    'debit'          => $movement->amount,
                    'credit'         => 0,
                ];
                // Crédito origen
                $lines[] = [
                    'voucher_id'     => $voucher->id,
                    'puc_account_id' => $account->puc_account_id,
                    'description'    => "Traslado a {$dest->name}",
                    'debit'          => 0,
                    'credit'         => $movement->amount,
                ];
            }
        }

        if (!empty($lines)) {
            VoucherLine::insert($lines);
        }

        return $voucher;
    }
}
