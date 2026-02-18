<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use Illuminate\Http\Request;

class CurrencyController extends Controller
{
    /**
     * Listar todas las monedas
     */
    public function index()
    {
        $currencies = Currency::orderBy('is_base', 'desc')
            ->orderBy('code', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $currencies,
        ]);
    }

    /**
     * Crear nueva moneda
     */
    public function store(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:3|unique:currencies,code',
            'name' => 'required|string|max:50',
            'symbol' => 'required|string|max:10',
            'exchange_rate' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $currency = Currency::create([
            'code' => strtoupper($request->code),
            'name' => $request->name,
            'symbol' => $request->symbol,
            'exchange_rate' => $request->exchange_rate,
            'is_base' => false, // Solo puede haber una moneda base
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Currency created successfully',
            'data' => $currency,
        ], 201);
    }

    /**
     * Mostrar una moneda
     */
    public function show(string $id)
    {
        $currency = Currency::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $currency,
        ]);
    }

    /**
     * Actualizar moneda
     */
    public function update(Request $request, string $id)
    {
        $currency = Currency::findOrFail($id);

        $request->validate([
            'code' => 'sometimes|string|size:3|unique:currencies,code,' . $id,
            'name' => 'sometimes|string|max:50',
            'symbol' => 'sometimes|string|max:10',
            'exchange_rate' => 'sometimes|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // No permitir cambiar is_base a través de update
        $data = $request->except('is_base');
        
        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $currency->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Currency updated successfully',
            'data' => $currency,
        ]);
    }

    /**
     * Eliminar moneda
     */
    public function destroy(string $id)
    {
        $currency = Currency::findOrFail($id);

        // No permitir eliminar moneda base
        if ($currency->is_base) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete base currency',
            ], 400);
        }

        // Verificar si tiene productos o ventas asociadas
        if ($currency->products()->count() > 0 || $currency->sales()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete currency with associated products or sales',
            ], 409);
        }

        $currency->delete();

        return response()->json([
            'success' => true,
            'message' => 'Currency deleted successfully',
        ]);
    }

    /**
     * Convertir monto entre monedas
     */
    public function convert(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'from' => 'required|exists:currencies,code',
            'to' => 'required|exists:currencies,code',
        ]);

        $fromCurrency = Currency::where('code', $request->from)->firstOrFail();
        $toCurrency = Currency::where('code', $request->to)->firstOrFail();

        $convertedAmount = $fromCurrency->convertTo($request->amount, $toCurrency);

        return response()->json([
            'success' => true,
            'data' => [
                'original_amount' => $request->amount,
                'from_currency' => $request->from,
                'to_currency' => $request->to,
                'converted_amount' => round($convertedAmount, 2),
                'exchange_rate' => round($toCurrency->exchange_rate / $fromCurrency->exchange_rate, 6),
            ],
        ]);
    }

    /**
     * Obtener moneda base
     */
    public function base()
    {
        $baseCurrency = Currency::base();

        if (!$baseCurrency) {
            return response()->json([
                'success' => false,
                'message' => 'Base currency not configured',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $baseCurrency,
        ]);
    }

    public function updateRatesFromAPI()
    {
        try {
            // Obtener moneda base
            $baseCurrency = Currency::where('is_base', true)->first();
            
            if (!$baseCurrency) {
                return response()->json([
                    'success' => false,
                    'message' => 'Base currency not configured',
                ], 400);
            }

            // API gratuita de tasas de cambio (exchangerate-api.com)
            $apiKey = env('EXCHANGE_RATE_API_KEY', 'free'); // Usa 'free' para versión gratuita
            $url = "https://v6.exchangerate-api.com/v6/{$apiKey}/latest/{$baseCurrency->code}";

            // Hacer petición a la API
            $response = file_get_contents($url);
            $data = json_decode($response, true);

            if (!isset($data['conversion_rates'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch exchange rates from API',
                ], 500);
            }

            $rates = $data['conversion_rates'];
            $updated = [];
            $errors = [];

            // Actualizar tasas de todas las monedas activas
            $currencies = Currency::where('is_active', true)
                ->where('is_base', false)
                ->get();

            foreach ($currencies as $currency) {
                if (isset($rates[$currency->code])) {
                    $oldRate = $currency->exchange_rate;
                    $newRate = $rates[$currency->code];
                    
                    $currency->update([
                        'exchange_rate' => $newRate,
                        'last_updated' => now(),
                    ]);

                    $updated[] = [
                        'code' => $currency->code,
                        'old_rate' => $oldRate,
                        'new_rate' => $newRate,
                        'change' => round((($newRate - $oldRate) / $oldRate) * 100, 2),
                    ];
                } else {
                    $errors[] = $currency->code;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Exchange rates updated successfully',
                'data' => [
                    'updated' => $updated,
                    'errors' => $errors,
                    'updated_at' => now()->toDateTimeString(),
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('Error updating exchange rates: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error updating exchange rates: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function updateRate(Request $request, string $id)
    {
        $currency = Currency::findOrFail($id);

        if ($currency->is_base) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update rate for base currency',
            ], 400);
        }

        $request->validate([
            'exchange_rate' => 'required|numeric|min:0',
        ]);

        $oldRate = $currency->exchange_rate;
        
        $currency->update([
            'exchange_rate' => $request->exchange_rate,
            'last_updated' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Exchange rate updated successfully',
            'data' => [
                'currency' => $currency,
                'old_rate' => $oldRate,
                'new_rate' => $currency->exchange_rate,
                'change' => round((($currency->exchange_rate - $oldRate) / $oldRate) * 100, 2),
            ],
        ]);
    }

    public function lastUpdate()
    {
        $currencies = Currency::whereNotNull('last_updated')
            ->orderBy('last_updated', 'desc')
            ->get(['code', 'name', 'exchange_rate', 'last_updated']);

        $latestUpdate = Currency::whereNotNull('last_updated')
            ->max('last_updated');

        return response()->json([
            'success' => true,
            'data' => [
                'currencies' => $currencies,
                'latest_update' => $latestUpdate,
            ],
        ]);
    }

}