<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name ?? $this->customer?->name,
            'customer_email' => $this->customer_email ?? $this->customer?->email,
            'customer_phone' => $this->customer_phone ?? $this->customer?->phone,
            'customer' => $this->whenLoaded('customer', function () {
                return new CustomerResource($this->customer);
            }),
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
            'subtotal' => number_format($this->subtotal, 2, '.', ''),
            'tax' => number_format($this->tax, 2, '.', ''),
            'discount' => number_format($this->discount, 2, '.', ''),
            'total' => number_format($this->total, 2, '.', ''),
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            'notes' => $this->notes,
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
            'items_count' => $this->items->count() ?? 0,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}