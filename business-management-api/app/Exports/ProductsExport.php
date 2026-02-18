<?php

namespace App\Exports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    protected $filters;

    public function __construct($filters = [])
    {
        $this->filters = $filters;
    }

    /**
     * Obtener los productos
     */
    public function collection()
    {
        $query = Product::with(['category', 'creator']);

        // Aplicar filtros
        if (isset($this->filters['search']) && $this->filters['search']) {
            $search = $this->filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        if (isset($this->filters['category_id']) && $this->filters['category_id']) {
            $query->where('category_id', $this->filters['category_id']);
        }

        return $query->get();
    }

    /**
     * Encabezados del Excel
     */
    public function headings(): array
    {
        return [
            'ID',
            'Nombre',
            'Categoría',
            'Descripción',
            'Precio',
            'Stock',
            'Estado Stock',
            'Creado Por',
            'Fecha Creación',
        ];
    }

    /**
     * Mapear datos
     */
    public function map($product): array
    {
        $stockStatus = $product->stock === 0 ? 'Sin stock' : 
                       ($product->stock < 10 ? 'Stock bajo' : 'Disponible');

        return [
            $product->id,
            $product->name,
            $product->category ? $product->category->name : 'Sin categoría',
            $product->description ?? '',
            number_format($product->price, 2),
            $product->stock,
            $stockStatus,
            $product->creator->name,
            $product->created_at->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Estilos
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}