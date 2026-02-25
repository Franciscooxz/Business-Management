<?php

namespace App\Services\Tax;

use App\Models\TaxDeclaration;
use App\Models\WithholdingEntry;
use Illuminate\Support\Facades\DB;

class IvaService
{
    /**
     * IVA generado (ventas): extraído de facturas electrónicas en el período.
     * Si la tabla o columna no existe aún, retorna 0 de forma segura.
     */
    public function getIvaGenerado(int $companyId, string $startDate, string $endDate): float
    {
        try {
            $result = DB::table('electronic_invoices')
                ->where('company_id', $companyId)
                ->whereBetween('issue_date', [$startDate, $endDate])
                ->whereNotIn('status', ['anulada', 'cancelled', 'void'])
                ->sum('tax_amount');

            return (float) ($result ?? 0);
        } catch (\Throwable) {
            // Graceful degradation si la estructura difiere
            return 0.0;
        }
    }

    /**
     * IVA descontable (compras): registrado manualmente en withholding_entries
     * con concepto de tipo 'iva' y dirección 'sufrida'.
     */
    public function getIvaDescontable(int $companyId, string $startDate, string $endDate): float
    {
        return (float) WithholdingEntry::where('company_id', $companyId)
            ->where('direction', 'sufrida')
            ->whereBetween('document_date', [$startDate, $endDate])
            ->whereHas('concept', fn ($q) => $q->where('type', 'iva'))
            ->sum('tax_amount');
    }

    /**
     * Calcula todos los totales para una declaración de IVA.
     *
     * Fórmula:
     *   Saldo a pagar = IVA generado − IVA descontable − saldo a favor anterior
     */
    public function calculateDeclarationTotals(TaxDeclaration $declaration): array
    {
        $start = $declaration->start_date->format('Y-m-d');
        $end   = $declaration->end_date->format('Y-m-d');

        $ivaGenerado    = $this->getIvaGenerado($declaration->company_id, $start, $end);
        $ivaDescontable = $this->getIvaDescontable($declaration->company_id, $start, $end);
        $prevFavor      = (float) $declaration->previous_balance_favor;

        $net = $ivaGenerado - $ivaDescontable - $prevFavor;

        return [
            'total_base'             => 0,
            'total_tax_generated'    => $ivaGenerado,
            'total_tax_discountable' => $ivaDescontable,
            'saldo_pagar'            => max(0, $net),
            'saldo_favor'            => max(0, -$net),
        ];
    }
}
