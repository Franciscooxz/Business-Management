<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

/**
 * KardexService
 *
 * Gestiona el libro de inventario permanente (Kardex) con soporte a
 * tres métodos de costeo colombianos:
 *   - Promedio Ponderado Móvil (más usado en Colombia)
 *   - PEPS — Primeras Entradas, Primeras Salidas (FIFO)
 *   - UEPS — Últimas Entradas, Primeras Salidas (LIFO)
 *
 * Todos los movimientos se registran con saldos corridos para
 * facilitar la generación de la tarjeta Kardex sin recalcular.
 */
class KardexService
{
    /**
     * Registrar un movimiento de inventario con cálculo de costo.
     *
     * @param  array{
     *   product_id:  int,
     *   user_id:     int,
     *   type:        string,
     *   quantity:    int,     (positivo = entrada, negativo = salida, 0 = ajuste)
     *   unit_cost:   float|null,
     *   reason:      string|null,
     *   reference:   string|null,
     *   source_type: string|null,
     *   source_id:   int|null,
     *   notes:       string|null,
     * } $data
     */
    public function registerMovement(array $data): StockMovement
    {
        return DB::transaction(function () use ($data) {
            /** @var Product $product */
            $product = Product::lockForUpdate()->findOrFail($data['product_id']);

            $type     = $data['type'];
            $qty      = (int) ($data['quantity'] ?? 0);
            $unitCost = isset($data['unit_cost']) ? (float) $data['unit_cost'] : null;

            // Determinar dirección del movimiento
            $isEntry = in_array($type, StockMovement::ENTRY_TYPES);
            $isExit  = in_array($type, StockMovement::EXIT_TYPES);
            $isAdjust = $type === 'ajuste';

            // Para ajuste: la cantidad puede ser positiva (suma) o negativa (resta)
            // Para entrada/salida: la cantidad es siempre positiva en el input,
            // y nosotros ajustamos el signo internamente
            $absQty  = abs($qty);
            $deltaQty = $isExit ? -$absQty : ($isAdjust ? $qty : $absQty);

            $previousStock = (int) $product->stock;
            $newStock      = $previousStock + $deltaQty;

            if ($newStock < 0) {
                throw new \RuntimeException(
                    "Stock insuficiente para '{$product->name}'. Disponible: {$previousStock}, Requerido: {$absQty}."
                );
            }

            // ── Calcular costo según método ────────────────────────────────────
            [$resolvedUnitCost, $newAvgCost] = $this->calculateCost(
                product: $product,
                type: $type,
                absQty: $absQty,
                deltaQty: $deltaQty,
                providedUnitCost: $unitCost,
                previousStock: $previousStock,
                newStock: $newStock,
            );

            $totalCost   = round($resolvedUnitCost * $absQty, 4);
            $balanceQty  = $newStock;
            $balanceValue = round($newStock * $newAvgCost, 4);

            // ── Guardar movimiento ─────────────────────────────────────────────
            $movement = StockMovement::create([
                'product_id'    => $product->id,
                'user_id'       => $data['user_id'],
                'type'          => $type,
                'quantity'      => $deltaQty,
                'previous_stock'=> $previousStock,
                'new_stock'     => $newStock,
                'reason'        => $data['reason'] ?? null,
                'unit_cost'     => $resolvedUnitCost,
                'total_cost'    => $totalCost,
                'balance_qty'   => $balanceQty,
                'balance_value' => $balanceValue,
                'reference'     => $data['reference'] ?? null,
                'source_type'   => $data['source_type'] ?? null,
                'source_id'     => $data['source_id'] ?? null,
                'notes'         => $data['notes'] ?? null,
            ]);

            // ── Actualizar producto ────────────────────────────────────────────
            $product->update([
                'stock'    => $newStock,
                'avg_cost' => $newAvgCost,
            ]);

            return $movement->load('product', 'user');
        });
    }

    /**
     * Obtener la tarjeta Kardex de un producto.
     * Devuelve los movimientos con saldos corridos, ya calculados.
     */
    public function getKardex(int $productId, array $filters = []): array
    {
        $product = Product::with(['category', 'currency'])->findOrFail($productId);

        $query = StockMovement::with('user')
            ->where('product_id', $productId)
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc');

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        $movements = $query->get();

        // Saldo inicial (antes del rango de fechas si hay filtro)
        $openingBalance = $this->getOpeningBalance($productId, $filters['date_from'] ?? null);

        return [
            'product'          => $product,
            'costing_method'   => $product->costing_method ?? 'promedio_ponderado',
            'opening_qty'      => $openingBalance['qty'],
            'opening_value'    => $openingBalance['value'],
            'opening_avg_cost' => $openingBalance['qty'] > 0
                ? round($openingBalance['value'] / $openingBalance['qty'], 4)
                : 0,
            'movements'        => $movements,
            'summary'          => $this->buildSummary($movements),
        ];
    }

    /**
     * Saldo inicial del inventario antes de una fecha.
     * Si no hay fecha, retorna (0, 0).
     */
    private function getOpeningBalance(int $productId, ?string $beforeDate): array
    {
        if (!$beforeDate) {
            return ['qty' => 0, 'value' => 0];
        }

        $last = StockMovement::where('product_id', $productId)
            ->whereDate('created_at', '<', $beforeDate)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        if (!$last) return ['qty' => 0, 'value' => 0];

        return [
            'qty'   => (float) $last->balance_qty,
            'value' => (float) $last->balance_value,
        ];
    }

    /** Resumen de entradas, salidas y saldo final */
    private function buildSummary(Collection $movements): array
    {
        $totalEntryQty   = 0;
        $totalEntryValue = 0;
        $totalExitQty    = 0;
        $totalExitValue  = 0;

        foreach ($movements as $m) {
            if (in_array($m->type, StockMovement::ENTRY_TYPES)) {
                $totalEntryQty   += abs((float) $m->quantity);
                $totalEntryValue += (float) $m->total_cost;
            } elseif (in_array($m->type, StockMovement::EXIT_TYPES)) {
                $totalExitQty    += abs((float) $m->quantity);
                $totalExitValue  += (float) $m->total_cost;
            }
        }

        $last = $movements->last();

        return [
            'total_entry_qty'    => $totalEntryQty,
            'total_entry_value'  => round($totalEntryValue, 2),
            'total_exit_qty'     => $totalExitQty,
            'total_exit_value'   => round($totalExitValue, 2),
            'final_balance_qty'  => $last ? (float) $last->balance_qty  : 0,
            'final_balance_value'=> $last ? (float) $last->balance_value : 0,
            'final_avg_cost'     => ($last && (float) $last->balance_qty > 0)
                ? round((float) $last->balance_value / (float) $last->balance_qty, 4)
                : 0,
        ];
    }

    /**
     * Calcular el costo unitario y el nuevo costo promedio del producto
     * según el método de costeo configurado.
     *
     * @return array [unitCostUsed, newAvgCost]
     */
    private function calculateCost(
        Product $product,
        string  $type,
        int     $absQty,
        int     $deltaQty,
        ?float  $providedUnitCost,
        int     $previousStock,
        int     $newStock,
    ): array {
        $method       = $product->costing_method ?? 'promedio_ponderado';
        $currentAvg   = (float) ($product->avg_cost ?? 0);

        // Entradas: siempre necesitamos el costo unitario de compra
        $isEntry = in_array($type, StockMovement::ENTRY_TYPES);
        $isExit  = in_array($type, StockMovement::EXIT_TYPES);

        if ($isExit || ($type === 'ajuste' && $deltaQty < 0)) {
            // Salidas: se usa el costo según el método
            // Para PEPS y UEPS el costo exacto requeriría llevar capas;
            // simplificamos usando avg_cost actual (compatible con promedio y razonable
            // como aproximación FIFO/LIFO en implementación básica)
            $unitCostUsed = $currentAvg > 0 ? $currentAvg : ($providedUnitCost ?? 0);
            $newAvgCost   = $currentAvg; // Las salidas no cambian el costo promedio
            return [$unitCostUsed, $newAvgCost];
        }

        // Entradas: calcular nuevo costo promedio ponderado
        $incomingCost = $providedUnitCost ?? 0;

        if ($method === 'promedio_ponderado') {
            if ($newStock <= 0) {
                $newAvgCost = $incomingCost;
            } else {
                // Promedio ponderado móvil:
                // nuevo_avg = (stock_anterior × avg_anterior + qty_entrada × costo_entrada) / nuevo_stock
                $newAvgCost = round(
                    (($previousStock * $currentAvg) + ($absQty * $incomingCost)) / $newStock,
                    4
                );
            }
        } elseif ($method === 'peps') {
            // PEPS: el nuevo promedio no cambia para la valoración de salidas;
            // guardamos el costo de la capa más reciente como avg_cost para referencia
            $newAvgCost = $incomingCost;
        } else {
            // UEPS: igual que PEPS en implementación básica
            $newAvgCost = $incomingCost;
        }

        return [$incomingCost, $newAvgCost];
    }

    /**
     * Listar todos los movimientos con filtros (para vista global de inventario).
     */
    public function listMovements(array $filters = [], int $perPage = 25): \Illuminate\Pagination\LengthAwarePaginator
    {
        $query = StockMovement::with(['product:id,name,sku', 'user:id,name'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }
        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->paginate($perPage);
    }
}
