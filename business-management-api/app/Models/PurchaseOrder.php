<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'supplier_id',
        'user_id',
        'currency_id',
        'order_date',
        'expected_delivery_date',
        'received_date',
        'subtotal',
        'tax',
        'shipping',
        'total',
        'status',
        'notes',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'received_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'shipping' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    // Generar número de orden automáticamente
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($purchaseOrder) {
            if (empty($purchaseOrder->order_number)) {
                $lastOrder = PurchaseOrder::orderBy('id', 'desc')->first();
                $nextNumber = $lastOrder ? (int) substr($lastOrder->order_number, 3) + 1 : 1;
                $purchaseOrder->order_number = 'PO-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
            }
        });
    }

    // Relación: Orden pertenece a proveedor
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    // Relación: Orden creada por usuario
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relación: Orden tiene moneda
    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    // Relación: Orden tiene muchos items
    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    // Scope para órdenes pendientes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    // Scope para órdenes recibidas
    public function scopeReceived($query)
    {
        return $query->where('status', 'received');
    }

    // Verificar si está completamente recibida
    public function isFullyReceived()
    {
        foreach ($this->items as $item) {
            if ($item->quantity_received < $item->quantity_ordered) {
                return false;
            }
        }
        return true;
    }
}