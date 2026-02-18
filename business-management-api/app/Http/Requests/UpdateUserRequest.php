<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        $userId = $this->route('user'); // ID del usuario siendo actualizado

        return [
            'name' => 'sometimes|string|max:255',
            'email' => [
                'sometimes',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($userId),
            ],
            'password' => 'sometimes|string|min:8',
            'role_id' => 'sometimes|exists:roles,id',
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.string' => 'El nombre debe ser texto.',
            'email.email' => 'El email debe ser válido.',
            'email.unique' => 'Este email ya está en uso.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'role_id.exists' => 'El rol seleccionado no existe.',
            'is_active.boolean' => 'El estado debe ser verdadero o falso.',
        ];
    }
}