<?php

namespace App\Services;

use App\Models\StockMovement;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Registrar un movimiento de stock
     * IMPORTANTE: Este método NO actualiza el stock del producto
     * Solo registra el historial del movimiento
     */
    public function registerMovement(
        int $productId,
        int $userId,
        string $type,
        int $quantity,
        ?string $reason = null
    ): StockMovement {
        $product = Product::findOrFail($productId);
        
        $previousStock = $product->stock;
        $newStock = $product->stock; // 👈 Ya está actualizado, NO sumar de nuevo
        
        // Crear movimiento
        $movement = StockMovement::create([
            'product_id' => $productId,
            'user_id' => $userId,
            'type' => $type,
            'quantity' => $quantity,
            'previous_stock' => $previousStock - $quantity, // 👈 Calcular el anterior
            'new_stock' => $newStock,
            'reason' => $reason,
        ]);
        
        return $movement;
    }
    
    /**
     * Registrar movimiento Y actualizar stock
     * Usar este método cuando quieras hacer cambios de stock manuales
     */
    public function registerMovementAndUpdateStock(
        int $productId,
        int $userId,
        string $type,
        int $quantity,
        ?string $reason = null
    ): StockMovement {
        return DB::transaction(function () use ($productId, $userId, $type, $quantity, $reason) {
            $product = Product::findOrFail($productId);
            
            $previousStock = $product->stock;
            $newStock = $previousStock + $quantity;
            
            // Crear movimiento
            $movement = StockMovement::create([
                'product_id' => $productId,
                'user_id' => $userId,
                'type' => $type,
                'quantity' => $quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'reason' => $reason,
            ]);
            
            // Actualizar stock del producto
            $product->update(['stock' => $newStock]);
            
            return $movement;
        });
    }
    
    /**
     * Obtener historial de un producto
     */
    public function getProductHistory(int $productId, int $limit = 50)
    {
        return StockMovement::where('product_id', $productId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}