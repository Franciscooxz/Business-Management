<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'product_id',
        'product_name',
        'quantity',
        'price',
        'subtotal',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    // Relación: Item pertenece a una venta
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    // Relación: Item pertenece a un producto
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}