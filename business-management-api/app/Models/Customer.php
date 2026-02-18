<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'created_by',
    ];

    // Relación: Cliente creado por un usuario
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Relación: Un cliente tiene muchas ventas
    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    // Calcular total gastado por el cliente
    public function getTotalSpentAttribute()
    {
        return $this->sales()->where('status', 'completada')->sum('total');
    }

    // Contar ventas del cliente
    public function getTotalPurchasesAttribute()
    {
        return $this->sales()->where('status', 'completada')->count();
    }
}