<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'exchange_rate',
        'is_base',
        'is_active',
        'last_updated',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:6',
        'is_base' => 'boolean',
        'is_active' => 'boolean',
        'last_updated' => 'datetime',
    ];

    // Relación: Moneda tiene muchos productos
    public function products()
    {
        return $this->hasMany(Product::class);
    }

    // Relación: Moneda tiene muchas ventas
    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    // Método para convertir de esta moneda a otra
    public function convertTo($amount, Currency $targetCurrency)
    {
        // Convertir primero a moneda base (USD)
        $amountInBase = $amount / $this->exchange_rate;
        
        // Luego convertir de base a moneda objetivo
        return $amountInBase * $targetCurrency->exchange_rate;
    }

    // Método estático para obtener la moneda base
    public static function base()
    {
        return self::where('is_base', true)->first();
    }

    // Formatear monto con símbolo
    public function format($amount)
    {
        return $this->symbol . ' ' . number_format($amount, 2, '.', ',');
    }
}