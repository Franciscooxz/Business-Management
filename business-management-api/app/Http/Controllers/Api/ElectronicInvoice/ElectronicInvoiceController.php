<?php

namespace App\Http\Controllers\Api\ElectronicInvoice;

use App\Http\Controllers\Controller;
use App\Models\DianResolution;
use App\Models\ElectronicInvoice;
use App\Models\ElectronicInvoiceItem;
use App\Services\Dian\CufeService;
use App\Services\Dian\UblXmlService;
use App\Services\Dian\DianTransmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ElectronicInvoiceController extends Controller
{
    public function __construct(
        private readonly CufeService             $cufeService,
        private readonly UblXmlService           $ublService,
        private readonly DianTransmissionService $transmissionService,
    ) {}

    // ── CRUD ──────────────────────────────────────────────────────────────────

    /** GET /api/electronic-invoices */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $query = ElectronicInvoice::with(['resolution', 'buyer'])
            ->where('company_id', $companyId)
            ->when($request->get('status'),        fn($q, $v) => $q->where('status', $v))
            ->when($request->get('document_type'), fn($q, $v) => $q->where('document_type', $v))
            ->when($request->get('search'), function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('full_number', 'like', "%{$search}%")
                      ->orWhere('buyer_name', 'like', "%{$search}%")
                      ->orWhere('buyer_document', 'like', "%{$search}%")
                      ->orWhere('cufe', 'like', "%{$search}%");
                });
            })
            ->when($request->get('date_from'), fn($q, $v) => $q->whereDate('issue_date', '>=', $v))
            ->when($request->get('date_to'),   fn($q, $v) => $q->whereDate('issue_date', '<=', $v))
            ->orderBy('issue_date', 'desc')
            ->orderBy('id', 'desc');

        $invoices = $query->paginate($request->get('per_page', 15));

        // Appends de totales para el listado
        $invoices->getCollection()->transform(function ($invoice) {
            return array_merge($invoice->toArray(), [
                'status_label' => ElectronicInvoice::STATUS_LABELS[$invoice->status] ?? $invoice->status,
            ]);
        });

        return response()->json([
            'data' => $invoices->items(),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
                'total'        => $invoices->total(),
            ],
        ]);
    }

    /** GET /api/electronic-invoices/{id} */
    public function show(ElectronicInvoice $electronicInvoice): JsonResponse
    {
        $electronicInvoice->load(['resolution', 'buyer', 'items.product', 'createdBy', 'referenceInvoice']);

        return response()->json([
            'data' => array_merge($electronicInvoice->toArray(), [
                'status_label'    => ElectronicInvoice::STATUS_LABELS[$electronicInvoice->status] ?? $electronicInvoice->status,
                'validation_url'  => $electronicInvoice->validation_url,
                'net_payable'     => $electronicInvoice->net_payable,
                'total_retentions'=> $electronicInvoice->total_retentions,
            ]),
        ]);
    }

    /** POST /api/electronic-invoices */
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateInvoice($request);

        DB::beginTransaction();
        try {
            // Obtener resolución y reservar consecutivo
            $resolution = DianResolution::findOrFail($validated['resolution_id']);

            if (!$resolution->isValid()) {
                return response()->json([
                    'message' => 'La resolución DIAN no está vigente o no tiene números disponibles.',
                ], 422);
            }

            $number     = $resolution->getNextNumber();
            $fullNumber = $resolution->formatNumber($number);

            // Crear cabecera
            $invoice = ElectronicInvoice::create(array_merge(
                $this->mapInvoiceFields($validated),
                [
                    'number'      => $number,
                    'prefix'      => $resolution->prefix,
                    'full_number' => $fullNumber,
                    'status'      => 'draft',
                    'created_by'  => Auth::id(),
                ]
            ));

            // Crear líneas y calcular totales
            $this->saveItems($invoice, $validated['items']);
            $this->recalculateTotals($invoice);

            // Calcular CUFE
            $invoice->load(['company', 'resolution']);
            $cufe = $this->cufeService->calculateFromInvoice($invoice);
            $invoice->update(['cufe' => $cufe]);

            DB::commit();

            $invoice->load(['resolution', 'items', 'buyer']);
            return response()->json(['data' => $invoice], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creando factura electrónica', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /** PUT /api/electronic-invoices/{id} */
    public function update(Request $request, ElectronicInvoice $electronicInvoice): JsonResponse
    {
        if (!$electronicInvoice->isDraft()) {
            return response()->json([
                'message' => 'Solo se pueden editar facturas en estado Borrador.',
            ], 422);
        }

        $validated = $this->validateInvoice($request, update: true);

        DB::beginTransaction();
        try {
            $electronicInvoice->update($this->mapInvoiceFields($validated));

            if (isset($validated['items'])) {
                $electronicInvoice->items()->delete();
                $this->saveItems($electronicInvoice, $validated['items']);
                $this->recalculateTotals($electronicInvoice);
            }

            // Recalcular CUFE al actualizar
            $electronicInvoice->load(['company', 'resolution']);
            $cufe = $this->cufeService->calculateFromInvoice($electronicInvoice);
            $electronicInvoice->update(['cufe' => $cufe]);

            DB::commit();

            $electronicInvoice->load(['resolution', 'items', 'buyer']);
            return response()->json(['data' => $electronicInvoice]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /** DELETE /api/electronic-invoices/{id} */
    public function destroy(ElectronicInvoice $electronicInvoice): JsonResponse
    {
        if (!$electronicInvoice->isDraft()) {
            return response()->json([
                'message' => 'Solo se pueden eliminar facturas en estado Borrador.',
            ], 422);
        }

        $electronicInvoice->delete();
        return response()->json(null, 204);
    }

    // ── Acciones DIAN ────────────────────────────────────────────────────────

    /**
     * POST /api/electronic-invoices/{id}/generate-xml
     * Genera el XML UBL 2.1 y lo almacena en el modelo.
     */
    public function generateXml(ElectronicInvoice $electronicInvoice): JsonResponse
    {
        if ($electronicInvoice->isAccepted()) {
            return response()->json(['message' => 'La factura ya fue aceptada por la DIAN.'], 422);
        }

        $electronicInvoice->load(['company', 'resolution', 'buyer', 'items.product']);

        $xml = $this->ublService->generate($electronicInvoice);

        // Guardar XML en el modelo (columna xml_content)
        $electronicInvoice->update([
            'xml_content' => $xml,
            'status'      => 'signed', // signed = XML listo para enviar
        ]);

        return response()->json([
            'message' => 'XML generado correctamente.',
            'cufe'    => $electronicInvoice->cufe,
        ]);
    }

    /**
     * POST /api/electronic-invoices/{id}/send
     * Envía la factura a la DIAN y actualiza el estado.
     */
    public function send(ElectronicInvoice $electronicInvoice): JsonResponse
    {
        if (!in_array($electronicInvoice->status, ['signed', 'sent', 'rejected'])) {
            return response()->json([
                'message' => 'La factura debe estar en estado Firmado, Enviado o Rechazado para reenviar.',
            ], 422);
        }

        if (!$electronicInvoice->xml_content) {
            // Auto-generar XML si no existe
            $electronicInvoice->load(['company', 'resolution', 'buyer', 'items.product']);
            $xml = $this->ublService->generate($electronicInvoice);
            $electronicInvoice->update(['xml_content' => $xml]);
        }

        $electronicInvoice->load(['company', 'resolution']);
        $result = $this->transmissionService->send($electronicInvoice);

        return response()->json([
            'data'    => $electronicInvoice->fresh(),
            'dian'    => $result,
            'message' => match($result['status']) {
                'accepted'   => 'Factura aceptada por la DIAN.',
                'processing' => 'Factura en procesamiento en la DIAN.',
                'rejected'   => 'Factura rechazada por la DIAN.',
                default      => 'Error al enviar a la DIAN.',
            },
        ]);
    }

    /**
     * POST /api/electronic-invoices/{id}/check-status
     * Consulta el estado actual en la DIAN.
     */
    public function checkStatus(ElectronicInvoice $electronicInvoice): JsonResponse
    {
        $electronicInvoice->load(['company', 'resolution']);
        $result = $this->transmissionService->checkStatus($electronicInvoice);

        return response()->json([
            'data'  => $electronicInvoice->fresh(),
            'dian'  => $result,
        ]);
    }

    /**
     * POST /api/electronic-invoices/{id}/cancel
     * Anula una factura (genera nota crédito o marca como cancelada en borrador).
     */
    public function cancel(Request $request, ElectronicInvoice $electronicInvoice): JsonResponse
    {
        if ($electronicInvoice->status === 'cancelled') {
            return response()->json(['message' => 'La factura ya está cancelada.'], 422);
        }

        if ($electronicInvoice->isDraft()) {
            $electronicInvoice->update(['status' => 'cancelled']);
            return response()->json(['message' => 'Borrador cancelado.', 'data' => $electronicInvoice]);
        }

        // Para facturas enviadas/aceptadas: requiere nota crédito
        return response()->json([
            'message' => 'Para anular una factura enviada a la DIAN debe generar una Nota Crédito.',
            'requires_credit_note' => true,
        ], 422);
    }

    /**
     * GET /api/electronic-invoices/{id}/download-xml
     * Descarga el XML de la factura.
     */
    public function downloadXml(ElectronicInvoice $electronicInvoice)
    {
        if (!$electronicInvoice->xml_content) {
            return response()->json(['message' => 'XML no generado.'], 404);
        }

        return response($electronicInvoice->xml_content, 200, [
            'Content-Type'        => 'application/xml',
            'Content-Disposition' => "attachment; filename=\"{$electronicInvoice->full_number}.xml\"",
        ]);
    }

    // ── Estadísticas para dashboard ──────────────────────────────────────────

    /** GET /api/electronic-invoices/stats */
    public function stats(): JsonResponse
    {
        $today = now()->startOfMonth();
        $stats = [
            'total_month'    => ElectronicInvoice::whereMonth('issue_date', now()->month)->count(),
            'total_accepted' => ElectronicInvoice::where('status', 'accepted')->whereMonth('issue_date', now()->month)->count(),
            'total_rejected' => ElectronicInvoice::where('status', 'rejected')->count(),
            'total_pending'  => ElectronicInvoice::whereIn('status', ['draft', 'signed', 'sent'])->count(),
            'value_month'    => ElectronicInvoice::where('status', 'accepted')
                ->whereMonth('issue_date', now()->month)
                ->sum('total'),
        ];
        return response()->json(['data' => $stats]);
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    private function validateInvoice(Request $request, bool $update = false): array
    {
        $required = $update ? 'sometimes' : 'required';

        return $request->validate([
            'resolution_id'         => "{$required}|exists:dian_resolutions,id",
            'document_type'         => "{$required}|in:01,91,92",
            'issue_date'            => "{$required}|date",
            'issue_time'            => 'nullable|date_format:H:i:s',
            'due_date'              => 'nullable|date',
            // Comprador
            'buyer_id'              => 'nullable|exists:third_parties,id',
            'buyer_name'            => "{$required}|string|max:250",
            'buyer_document_type'   => "{$required}|in:CC,TI,CE,NIT,PP,TE",
            'buyer_document'        => "{$required}|string|max:50",
            'buyer_nit_dv'          => 'nullable|string|max:2',
            'buyer_email'           => 'nullable|email|max:150',
            'buyer_person_type'     => 'nullable|in:natural,juridica',
            'buyer_address'         => 'nullable|string|max:200',
            'buyer_city'            => 'nullable|string|max:100',
            'buyer_city_code'       => 'nullable|string|max:10',
            'buyer_department_code' => 'nullable|string|max:5',
            'buyer_postal_code'     => 'nullable|string|max:10',
            // Notas y corrección
            'notes'                 => 'nullable|string|max:500',
            'correction_concept'    => 'nullable|in:1,2,3,4,5,6',
            'reference_invoice_id'  => 'nullable|exists:electronic_invoices,id',
            // Moneda
            'currency'              => 'nullable|string|max:3',
            'exchange_rate'         => 'nullable|numeric|min:1',
            // Líneas
            'items'                 => "{$required}|array|min:1",
            'items.*.line_number'   => 'required|integer|min:1',
            'items.*.product_id'    => 'nullable|exists:products,id',
            'items.*.description'   => 'required|string|max:300',
            'items.*.unit_code'     => 'nullable|string|max:10',
            'items.*.quantity'      => 'required|numeric|min:0.0001',
            'items.*.unit_price'    => 'required|numeric|min:0',
            'items.*.discount_rate' => 'nullable|numeric|min:0|max:1',
            'items.*.tax_code'      => 'required|in:01,04,03,ZY,ZZ',
            'items.*.tax_name'      => 'required|string|max:50',
            'items.*.tax_rate'      => 'required|numeric|min:0|max:1',
            'items.*.standard_code' => 'nullable|string|max:50',
            'items.*.brand_name'    => 'nullable|string|max:100',
        ]);
    }

    private function mapInvoiceFields(array $validated): array
    {
        return collect($validated)->except(['items'])->toArray();
    }

    private function saveItems(ElectronicInvoice $invoice, array $items): void
    {
        foreach ($items as $itemData) {
            $item = new ElectronicInvoiceItem(array_merge($itemData, [
                'invoice_id'     => $invoice->id,
                'discount_rate'  => $itemData['discount_rate'] ?? 0,
                'unit_code'      => $itemData['unit_code'] ?? '94',
            ]));
            $item->recalculate();
            $item->save();
        }
    }

    private function recalculateTotals(ElectronicInvoice $invoice): void
    {
        $invoice->load('items');

        $subtotal      = $invoice->items->sum(fn($i) => (float) $i->subtotal);
        $discountTotal = $invoice->items->sum(fn($i) => (float) $i->discount_value);
        $taxIva        = $invoice->items->where('tax_code', '01')->sum(fn($i) => (float) $i->tax_value);
        $taxInc        = $invoice->items->where('tax_code', '04')->sum(fn($i) => (float) $i->tax_value);
        $taxIca        = $invoice->items->where('tax_code', '03')->sum(fn($i) => (float) $i->tax_value);
        $total         = $subtotal + $taxIva + $taxInc + $taxIca;

        $invoice->update([
            'subtotal'       => round($subtotal, 2),
            'discount_total' => round($discountTotal, 2),
            'tax_iva'        => round($taxIva, 2),
            'tax_inc'        => round($taxInc, 2),
            'tax_ica'        => round($taxIca, 2),
            'total'          => round($total, 2),
        ]);
    }
}
