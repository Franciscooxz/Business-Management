<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'sku',
        'description',
        'category_id',
        'price',
        'stock',
        'currency_id',
        'created_by',
        // Kardex / Costeo
        'costing_method',
        'avg_cost',
        'min_stock',
        'max_stock',
        'unit_of_measure',
    ];

    protected function casts(): array
    {
        return [
            'price'     => 'decimal:2',
            'avg_cost'  => 'decimal:4',
            'stock'     => 'integer',
            'min_stock' => 'integer',
            'max_stock' => 'integer',
        ];
    }

    // ── Relaciones ──────────────────────────────────────────────────────────────

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class)->orderByDesc('created_at');
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function purchaseOrderItems()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function suppliers()
    {
        return $this->belongsToMany(Supplier::class, 'product_supplier')
            ->withPivot('cost', 'supplier_sku', 'lead_time_days', 'is_preferred')
            ->withTimestamps();
    }

    // ── Accessors ───────────────────────────────────────────────────────────────

    /** Total vendido en unidades */
    public function getTotalSoldAttribute(): int
    {
        return (int) $this->saleItems()->sum('quantity');
    }

    /** Ingresos generados */
    public function getRevenueAttribute(): float
    {
        return (float) $this->saleItems()->sum('subtotal');
    }

    /** Valor total del inventario al costo */
    public function getInventoryValueAttribute(): float
    {
        return round((float) $this->stock * (float) $this->avg_cost, 2);
    }

    /** Estado del stock */
    public function getStockStatusAttribute(): string
    {
        if ($this->stock <= 0)                         return 'out_of_stock';
        if ($this->min_stock > 0 && $this->stock <= $this->min_stock) return 'low_stock';
        return 'in_stock';
    }

    /** Proveedor preferido */
    public function preferredSupplier()
    {
        return $this->suppliers()->wherePivot('is_preferred', true)->first();
    }

    // ── Métodos de precio ───────────────────────────────────────────────────────

    public function getPriceIn(Currency $targetCurrency)
    {
        if (!$this->currency) return $this->price;
        return $this->currency->convertTo($this->price, $targetCurrency);
    }

    public function getFormattedPrice(): string
    {
        if (!$this->currency) return '$ ' . number_format($this->price, 2, ',', '.');
        return $this->currency->format($this->price);
    }

    // ── Scopes ──────────────────────────────────────────────────────────────────

    public function scopeLowStock($query)
    {
        return $query->whereRaw('stock <= min_stock AND min_stock > 0 AND stock > 0');
    }

    public function scopeOutOfStock($query)
    {
        return $query->where('stock', '<=', 0);
    }

    public function scopeInStock($query)
    {
        return $query->where('stock', '>', 0);
    }
}
