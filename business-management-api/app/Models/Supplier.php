<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'company_name',
        'tax_id',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'notes',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relación: Proveedor creado por usuario
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Relación: Proveedor tiene muchos productos
    public function products()
    {
        return $this->belongsToMany(Product::class, 'product_supplier')
            ->withPivot('cost', 'supplier_sku', 'lead_time_days', 'is_preferred')
            ->withTimestamps();
    }

    // Relación: Proveedor tiene muchas órdenes de compra
    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    // Total gastado con este proveedor
    public function getTotalSpentAttribute()
    {
        return $this->purchaseOrders()
            ->where('status', 'received')
            ->sum('total');
    }

    // Total órdenes con este proveedor
    public function getTotalOrdersAttribute()
    {
        return $this->purchaseOrders()->count();
    }
}