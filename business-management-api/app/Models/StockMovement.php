<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    /** Tipos de movimiento válidos */
    const TYPES = [
        'inicial'            => 'Inventario Inicial',
        'compra'             => 'Compra',
        'venta'              => 'Venta',
        'devolucion_compra'  => 'Devolución a Proveedor',
        'devolucion_venta'   => 'Devolución de Cliente',
        'traslado'           => 'Traslado',
        'ajuste'             => 'Ajuste de Inventario',
        'entrada'            => 'Entrada Manual',
        'salida'             => 'Salida Manual',
    ];

    /** Tipos que suman al inventario */
    const ENTRY_TYPES = ['inicial', 'compra', 'devolucion_venta', 'traslado', 'entrada'];

    /** Tipos que restan del inventario */
    const EXIT_TYPES  = ['venta', 'devolucion_compra', 'salida'];

    protected $fillable = [
        'product_id',
        'user_id',
        'type',
        'quantity',
        'previous_stock',
        'new_stock',
        'reason',
        // Kardex
        'unit_cost',
        'total_cost',
        'balance_qty',
        'balance_value',
        'reference',
        'source_type',
        'source_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity'       => 'integer',
            'previous_stock' => 'integer',
            'new_stock'      => 'integer',
            'unit_cost'      => 'decimal:4',
            'total_cost'     => 'decimal:4',
            'balance_qty'    => 'decimal:4',
            'balance_value'  => 'decimal:4',
        ];
    }

    // ── Relaciones ──────────────────────────────────────────────────────────────

    public function product(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ── Scopes ──────────────────────────────────────────────────────────────────

    public function scopeForProduct($query, int $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeEntries($query)
    {
        return $query->whereIn('type', self::ENTRY_TYPES);
    }

    public function scopeExits($query)
    {
        return $query->whereIn('type', self::EXIT_TYPES);
    }

    public function scopeDateRange($query, ?string $from, ?string $to)
    {
        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to)   $query->whereDate('created_at', '<=', $to);
        return $query;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    /** ¿Es un movimiento de entrada (suma stock)? */
    public function isEntry(): bool
    {
        return in_array($this->type, self::ENTRY_TYPES);
    }

    /** ¿Es un movimiento de ajuste sin dirección fija? */
    public function isAdjustment(): bool
    {
        return $this->type === 'ajuste';
    }

    /** Label legible */
    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }
}
