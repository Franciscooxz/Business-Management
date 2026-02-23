<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ElectronicInvoiceItem extends Model
{
    /** Códigos de unidad de medida UNECE más comunes en Colombia */
    const UNIT_CODES = [
        '94' => 'Unidad (UN)',
        'KGM' => 'Kilogramo',
        'LTR' => 'Litro',
        'MTR' => 'Metro',
        'MTK' => 'Metro cuadrado',
        'MTQ' => 'Metro cúbico',
        'HUR' => 'Hora',
        'DAY' => 'Día',
        'MON' => 'Mes',
        'SET' => 'Conjunto/Kit',
        'BOX' => 'Caja',
        'GLL' => 'Galón',
    ];

    /** Tipos de tributo DIAN */
    const TAX_CODES = [
        '01' => ['name' => 'IVA',   'rates' => [0, 0.05, 0.19]],
        '04' => ['name' => 'INC',   'rates' => [0.08, 0.16]],
        'ZY' => ['name' => 'No aplica', 'rates' => [0]],
        'ZZ' => ['name' => 'Exento', 'rates' => [0]],
    ];

    protected $fillable = [
        'invoice_id', 'product_id', 'line_number', 'description', 'unit_code',
        'quantity', 'unit_price', 'discount_rate', 'discount_value', 'subtotal',
        'tax_code', 'tax_name', 'tax_rate', 'tax_base', 'tax_value',
        'total_line', 'standard_code', 'brand_name',
    ];

    protected function casts(): array
    {
        return [
            'quantity'       => 'decimal:4',
            'unit_price'     => 'decimal:4',
            'discount_rate'  => 'decimal:6',
            'discount_value' => 'decimal:2',
            'subtotal'       => 'decimal:2',
            'tax_rate'       => 'decimal:6',
            'tax_base'       => 'decimal:2',
            'tax_value'      => 'decimal:2',
            'total_line'     => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo { return $this->belongsTo(ElectronicInvoice::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }

    /** Calcula y actualiza los campos derivados */
    public function recalculate(): void
    {
        $subtotal       = round((float) $this->quantity * (float) $this->unit_price * (1 - (float) $this->discount_rate), 2);
        $discountValue  = round((float) $this->quantity * (float) $this->unit_price * (float) $this->discount_rate, 2);
        $taxBase        = $subtotal;
        $taxValue       = round($taxBase * (float) $this->tax_rate, 2);
        $totalLine      = $subtotal + $taxValue;

        $this->forceFill([
            'subtotal'       => $subtotal,
            'discount_value' => $discountValue,
            'tax_base'       => $taxBase,
            'tax_value'      => $taxValue,
            'total_line'     => $totalLine,
        ]);
    }
}
