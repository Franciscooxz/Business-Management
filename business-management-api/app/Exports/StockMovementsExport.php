<?php

namespace App\Exports;

use App\Models\StockMovement;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StockMovementsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    protected $filters;

    public function __construct($filters = [])
    {
        $this->filters = $filters;
    }

    public function collection()
    {
        $query = StockMovement::with(['product', 'user']);

        // Filtros
        if (isset($this->filters['product_id']) && $this->filters['product_id']) {
            $query->where('product_id', $this->filters['product_id']);
        }

        if (isset($this->filters['type']) && $this->filters['type']) {
            $query->where('type', $this->filters['type']);
        }

        if (isset($this->filters['date_from']) && $this->filters['date_from']) {
            $query->whereDate('created_at', '>=', $this->filters['date_from']);
        }

        if (isset($this->filters['date_to']) && $this->filters['date_to']) {
            $query->whereDate('created_at', '<=', $this->filters['date_to']);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Producto',
            'Tipo',
            'Cantidad',
            'Stock Anterior',
            'Stock Nuevo',
            'Razón',
            'Usuario',
            'Fecha',
        ];
    }

    public function map($movement): array
    {
        return [
            $movement->id,
            $movement->product->name,
            ucfirst($movement->type),
            $movement->quantity,
            $movement->previous_stock,
            $movement->new_stock,
            $movement->reason ?? '',
            $movement->user->name,
            $movement->created_at->format('Y-m-d H:i:s'),
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}