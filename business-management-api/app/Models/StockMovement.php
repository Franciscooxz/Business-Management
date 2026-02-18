<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'user_id',
        'type',
        'quantity',
        'previous_stock',
        'new_stock',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'previous_stock' => 'integer',
            'new_stock' => 'integer',
        ];
    }

    // Relación: Movimiento pertenece a un producto
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Relación: Movimiento pertenece a un usuario
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}