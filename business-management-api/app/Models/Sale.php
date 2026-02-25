<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'third_party_id',
        'electronic_invoice_id',
        'currency_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'user_id',
        'subtotal',
        'tax',
        'discount',
        'total',
        'payment_method',
        'status',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    // Relación: Venta pertenece a un cliente (opcional)
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    // Relación: Venta realizada por un usuario (vendedor)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relación: Una venta tiene muchos items
    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    // Scope para ventas completadas
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completada');
    }

    // Scope para ventas de hoy
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    // Scope para ventas de esta semana
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
    }

    // Scope para ventas de este mes
    public function scopeThisMonth($query)
    {
        return $query->whereMonth('created_at', now()->month)
                     ->whereYear('created_at', now()->year);
    }

    // Relación con moneda
    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    // Método para obtener total en otra moneda
    public function getTotalIn(Currency $targetCurrency)
    {
        if (!$this->currency) {
            return $this->total;
        }
        
        return $this->currency->convertTo($this->total, $targetCurrency);
    }
}