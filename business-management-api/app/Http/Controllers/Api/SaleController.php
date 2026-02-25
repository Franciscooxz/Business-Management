<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSaleRequest;
use App\Http\Resources\SaleResource;
use App\Models\DianResolution;
use App\Models\ElectronicInvoice;
use App\Models\ElectronicInvoiceItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use App\Models\ThirdParty;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    protected $stockService;

    public function __construct(StockService $stockService = null)
    {
        $this->stockService = $stockService;
    }

    /**
     * Listar ventas con filtros
     */
    public function index(Request $request)
    {
        $query = Sale::with(['customer', 'user', 'items.product']);

        if ($request->has('status'))         $query->where('status', $request->status);
        if ($request->has('payment_method')) $query->where('payment_method', $request->payment_method);
        if ($request->has('customer_id'))    $query->where('customer_id', $request->customer_id);
        if ($request->has('date_from'))      $query->whereDate('created_at', '>=', $request->date_from);
        if ($request->has('date_to'))        $query->whereDate('created_at', '<=', $request->date_to);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_email', 'like', "%{$search}%")
                  ->orWhereHas('customer', fn($q) => $q->where('name', 'like', "%{$search}%"));
            });
        }

        $sales = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return SaleResource::collection($sales)->additional(['success' => true]);
    }

    /**
     * Crear nueva venta — con opción de generar Factura Electrónica DIAN en borrador.
     */
    public function store(StoreSaleRequest $request)
    {
        return DB::transaction(function () use ($request) {

            // ── Validar stock ─────────────────────────────────────────────────
            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);
                if ($product->stock < $item['quantity']) {
                    return response()->json([
                        'success' => false,
                        'message' => "Stock insuficiente para «{$product->name}». Disponible: {$product->stock}",
                    ], 400);
                }
            }

            $companyId = auth()->user()->company_id;

            // ── Crear la venta ────────────────────────────────────────────────
            $sale = Sale::create([
                'company_id'      => $companyId,
                'customer_id'     => $request->customer_id,
                'third_party_id'  => $request->third_party_id,
                'customer_name'   => $request->customer_name,
                'customer_email'  => $request->customer_email,
                'customer_phone'  => $request->customer_phone,
                'user_id'         => auth()->id(),
                'subtotal'        => $request->subtotal,
                'tax'             => $request->tax ?? 0,
                'discount'        => $request->discount ?? 0,
                'total'           => $request->total,
                'payment_method'  => $request->payment_method,
                'status'          => $request->status ?? 'completada',
                'notes'           => $request->notes,
            ]);

            // ── Crear items y descontar stock ─────────────────────────────────
            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);

                SaleItem::create([
                    'sale_id'      => $sale->id,
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'quantity'     => $item['quantity'],
                    'price'        => $item['price'],
                    'subtotal'     => $item['quantity'] * $item['price'],
                ]);

                $product->decrement('stock', $item['quantity']);

                if ($this->stockService) {
                    $this->stockService->registerMovement(
                        $product->id, auth()->id(), 'venta',
                        -$item['quantity'], "Venta #{$sale->id}"
                    );
                }
            }

            // ── Generar Factura Electrónica DIAN (si se solicitó) ─────────────
            $invoiceData = null;
            if ($request->boolean('generate_invoice') && $companyId) {
                $invoiceData = $this->createDraftInvoice($sale, $request, $companyId);
            }

            $sale->load(['customer', 'user', 'items.product']);

            $responseData = (new SaleResource($sale))->additional([
                'success' => true,
                'message' => 'Venta procesada exitosamente.',
            ])->response()->setStatusCode(201);

            // Si se generó factura, agregar info al response
            if ($invoiceData) {
                $data = $responseData->getData(true);
                $data['invoice'] = $invoiceData;
                $responseData->setData($data);
            }

            return $responseData;
        });
    }

    /**
     * Crea una Factura Electrónica en estado borrador a partir de una venta POS.
     */
    private function createDraftInvoice(Sale $sale, Request $request, int $companyId): ?array
    {
        try {
            // Buscar resolución activa de la empresa
            $resolution = DianResolution::where('company_id', $companyId)
                ->where('is_active', true)
                ->where('document_type', '01') // Factura de venta
                ->first();

            if (! $resolution) {
                return ['error' => 'No hay resolución DIAN activa para generar facturas. Configúrela en Facturación Electrónica.'];
            }

            // Datos del comprador
            $buyer     = $request->third_party_id ? ThirdParty::find($request->third_party_id) : null;
            $buyerName = $buyer?->display_name ?? $sale->customer_name ?? 'Consumidor Final';
            $buyerDoc  = $buyer?->document_number ?? '222222222';
            $buyerDocT = $buyer?->document_type   ?? 'CC';
            $buyerEmail= $buyer?->email            ?? $sale->customer_email;

            // Siguiente número de factura
            $nextNumber = ($resolution->current_number ?? $resolution->from_number ?? 1);
            $prefix     = $resolution->prefix ?? 'FV';
            $fullNumber = $prefix . '-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

            // Calcular totales de IVA desde los ítems
            $subtotal = (float) $sale->subtotal;
            $taxIva   = (float) $sale->tax;
            $total    = (float) $sale->total;

            $invoice = ElectronicInvoice::create([
                'company_id'         => $companyId,
                'resolution_id'      => $resolution->id,
                'document_type'      => '01',
                'document_type_name' => 'Factura de Venta',
                'prefix'             => $prefix,
                'number'             => $nextNumber,
                'full_number'        => $fullNumber,
                'issue_date'         => now()->toDateString(),
                'issue_time'         => now()->toTimeString(),
                'buyer_id'           => $buyer?->id,
                'buyer_name'         => $buyerName,
                'buyer_document'     => $buyerDoc,
                'buyer_document_type'=> $buyerDocT,
                'buyer_email'        => $buyerEmail,
                'subtotal'           => $subtotal,
                'tax_iva'            => $taxIva,
                'total'              => $total,
                'status'             => 'draft',
                'created_by'         => auth()->id(),
            ]);

            // Crear ítems de la factura
            $lineNumber = 1;
            foreach ($sale->items as $item) {
                $unitPrice  = (float) $item->price;
                $itemTotal  = $unitPrice * $item->quantity;

                ElectronicInvoiceItem::create([
                    'invoice_id'   => $invoice->id,
                    'line_number'  => $lineNumber++,
                    'product_id'   => $item->product_id,
                    'description'  => $item->product_name,
                    'quantity'     => $item->quantity,
                    'unit_price'   => $unitPrice,
                    'discount'     => 0,
                    'subtotal'     => $itemTotal,
                    'tax_rate'     => 0,
                    'tax_amount'   => 0,
                    'total'        => $itemTotal,
                ]);
            }

            // Actualizar consecutive en la resolución
            $resolution->increment('current_number');

            // Vincular factura a la venta
            $sale->update(['electronic_invoice_id' => $invoice->id]);

            return [
                'id'          => $invoice->id,
                'full_number' => $invoice->full_number,
                'status'      => 'draft',
                'message'     => "Factura {$fullNumber} creada en borrador. Revísala en Facturación Electrónica antes de enviar a DIAN.",
            ];

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('POS: No se pudo crear factura DIAN: ' . $e->getMessage());
            return ['error' => 'La venta fue creada pero la factura DIAN no pudo generarse: ' . $e->getMessage()];
        }
    }

    public function show(string $id)
    {
        $sale = Sale::with(['customer', 'user', 'items.product'])->findOrFail($id);

        return (new SaleResource($sale))->additional(['success' => true]);
    }

    public function cancel(string $id)
    {
        return DB::transaction(function () use ($id) {
            $sale = Sale::with('items')->findOrFail($id);

            if ($sale->status === 'cancelada') {
                return response()->json(['success' => false, 'message' => 'La venta ya estaba cancelada.'], 400);
            }

            foreach ($sale->items as $item) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->increment('stock', $item->quantity);
                    if ($this->stockService) {
                        $this->stockService->registerMovement(
                            $product->id, auth()->id(), 'devolucion_venta',
                            $item->quantity, "Cancelación de venta #{$sale->id}"
                        );
                    }
                }
            }

            $sale->update(['status' => 'cancelada']);
            $sale->load(['customer', 'user', 'items.product']);

            return (new SaleResource($sale))->additional(['success' => true, 'message' => 'Venta cancelada.']);
        });
    }

    public function statistics(Request $request)
    {
        $period = $request->get('period', 'today');
        $query  = Sale::where('status', 'completada');

        match ($period) {
            'week'  => $query->thisWeek(),
            'month' => $query->thisMonth(),
            'year'  => $query->whereYear('created_at', now()->year),
            default => $query->today(),
        };

        $totalSales   = $query->count();
        $totalRevenue = $query->sum('total');
        $avgTicket    = $totalSales > 0 ? $totalRevenue / $totalSales : 0;

        $topProducts = SaleItem::select('product_id', 'product_name', DB::raw('SUM(quantity) as total_quantity'))
            ->whereHas('sale', fn($q) => $q->where('status', 'completada'))
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('total_quantity')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'total_sales'    => $totalSales,
                'total_revenue'  => number_format($totalRevenue, 2, '.', ''),
                'average_ticket' => number_format($avgTicket, 2, '.', ''),
                'top_products'   => $topProducts,
            ],
        ]);
    }

    public function destroy(string $id)
    {
        $sale = Sale::findOrFail($id);

        if ($sale->status !== 'cancelada') {
            return response()->json(['success' => false, 'message' => 'Solo se pueden eliminar ventas canceladas.'], 400);
        }

        $sale->delete();

        return response()->json(['success' => true, 'message' => 'Venta eliminada.']);
    }
}
