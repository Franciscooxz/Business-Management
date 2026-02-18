<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'category_id' => 'sometimes|nullable|exists:categories,id',
            'description' => 'sometimes|nullable|string|max:1000',
            'price' => 'sometimes|numeric|min:0|max:999999.99',
            'stock' => 'sometimes|integer|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'name.string' => 'El nombre debe ser texto.',
            'name.max' => 'El nombre no puede exceder 255 caracteres.',
            'description.max' => 'La descripción no puede exceder 1000 caracteres.',
            'price.numeric' => 'El precio debe ser un número.',
            'price.min' => 'El precio no puede ser negativo.',
            'price.max' => 'El precio máximo es 999,999.99.',
            'stock.integer' => 'El stock debe ser un número entero.',
            'stock.min' => 'El stock no puede ser negativo.',
        ];
    }
}