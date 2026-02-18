<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'product_id',
        'quantity_ordered',
        'quantity_received',
        'unit_cost',
        'subtotal',
    ];

    protected $casts = [
        'quantity_ordered' => 'integer',
        'quantity_received' => 'integer',
        'unit_cost' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    // Relación: Item pertenece a orden de compra
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    // Relación: Item pertenece a producto
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Cantidad pendiente de recibir
    public function getPendingQuantityAttribute()
    {
        return $this->quantity_ordered - $this->quantity_received;
    }
}