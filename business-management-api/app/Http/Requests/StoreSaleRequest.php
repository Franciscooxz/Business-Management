<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'required_without:customer_id|string|max:255',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string|max:20',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'subtotal' => 'required|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'payment_method' => 'required|in:efectivo,tarjeta,transferencia',
            'status' => 'nullable|in:completada,pendiente,cancelada',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Debe agregar al menos un producto',
            'items.*.product_id.required' => 'El producto es requerido',
            'items.*.product_id.exists' => 'El producto no existe',
            'items.*.quantity.required' => 'La cantidad es requerida',
            'items.*.quantity.min' => 'La cantidad debe ser mayor a 0',
            'payment_method.required' => 'El método de pago es requerido',
            'payment_method.in' => 'Método de pago inválido',
        ];
    }
}