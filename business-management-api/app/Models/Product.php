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
        'description',
        'category_id',  
        'price',
        'stock',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'stock' => 'integer',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    // Relación: Producto aparece en items de venta
    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    // Calcular total vendido del producto
    public function getTotalSoldAttribute()
    {
        return $this->saleItems()->sum('quantity');
    }

    // Calcular ingresos generados por el producto
    public function getRevenueAttribute()
    {
        return $this->saleItems()->sum('subtotal');
    }

        public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    // Método para obtener precio en otra moneda
    public function getPriceIn(Currency $targetCurrency)
    {
        if (!$this->currency) {
            return $this->price;
        }
        
        return $this->currency->convertTo($this->price, $targetCurrency);
    }

    public function getFormattedPrice()
    {
        if (!$this->currency) {
            return '$' . number_format($this->price, 2);
        }
        
        return $this->currency->format($this->price);
    }

    // Relación con proveedores (muchos a muchos)
    public function suppliers()
    {
        return $this->belongsToMany(Supplier::class, 'product_supplier')
            ->withPivot('cost', 'supplier_sku', 'lead_time_days', 'is_preferred')
            ->withTimestamps();
    }

    // Obtener proveedor preferido
    public function preferredSupplier()
    {
        return $this->suppliers()->wherePivot('is_preferred', true)->first();
    }

    // Items de órdenes de compra
    public function purchaseOrderItems()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

}