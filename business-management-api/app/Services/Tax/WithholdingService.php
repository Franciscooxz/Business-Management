<?php

namespace App\Services\Tax;

use App\Models\TaxConcept;
use App\Models\TaxDeclaration;
use App\Models\WithholdingEntry;

class WithholdingService
{
    /**
     * Calcula el valor de retención para un concepto y base dados.
     */
    public function calculate(TaxConcept $concept, float $baseAmount): float
    {
        return $concept->calculate($baseAmount);
    }

    /**
     * Crea una entrada de retención calculando el tax_amount automáticamente.
     */
    public function createEntry(array $data): WithholdingEntry
    {
        $concept = TaxConcept::findOrFail($data['tax_concept_id']);

        $data['rate']       = $concept->rate;
        $data['tax_amount'] = $concept->calculate((float) $data['base_amount']);

        return WithholdingEntry::create($data);
    }

    /**
     * Resumen de retenciones por concepto para un período.
     * Útil para construir declaraciones.
     */
    public function getSummaryForPeriod(
        int    $companyId,
        string $startDate,
        string $endDate,
        string $type = 'retefuente'
    ): array {
        $rows = WithholdingEntry::with('concept')
            ->where('company_id', $companyId)
            ->where('direction', 'practicada')
            ->whereBetween('document_date', [$startDate, $endDate])
            ->whereHas('concept', fn ($q) => $q->where('type', $type))
            ->selectRaw('
                tax_concept_id,
                SUM(base_amount) as total_base,
                SUM(tax_amount)  as total_tax,
                COUNT(*)         as entry_count
            ')
            ->groupBy('tax_concept_id')
            ->get();

        return $rows->map(fn ($row) => [
            'concept_id'   => $row->tax_concept_id,
            'concept_code' => $row->concept?->code        ?? 'N/A',
            'concept_name' => $row->concept?->name        ?? 'N/A',
            'rate'         => $row->concept?->rate        ?? 0,
            'total_base'   => (float) $row->total_base,
            'total_tax'    => (float) $row->total_tax,
            'entry_count'  => $row->entry_count,
        ])->toArray();
    }

    /**
     * Calcula totales para una declaración de ReteFuente o ReteICA.
     */
    public function calculateDeclarationTotals(TaxDeclaration $declaration): array
    {
        $type = in_array($declaration->type, ['retefuente', 'reteica'])
            ? $declaration->type
            : 'retefuente';

        $totals = WithholdingEntry::where('company_id', $declaration->company_id)
            ->where('direction', 'practicada')
            ->whereBetween('document_date', [
                $declaration->start_date->format('Y-m-d'),
                $declaration->end_date->format('Y-m-d'),
            ])
            ->whereHas('concept', fn ($q) => $q->where('type', $type))
            ->selectRaw('SUM(base_amount) as total_base, SUM(tax_amount) as total_tax')
            ->first();

        $totalBase  = (float) ($totals->total_base ?? 0);
        $totalTax   = (float) ($totals->total_tax  ?? 0);
        $prevFavor  = (float) $declaration->previous_balance_favor;
        $net        = $totalTax - $prevFavor;

        return [
            'total_base'             => $totalBase,
            'total_tax_generated'    => $totalTax,
            'total_tax_discountable' => 0,
            'saldo_pagar'            => max(0, $net),
            'saldo_favor'            => max(0, -$net),
        ];
    }
}
