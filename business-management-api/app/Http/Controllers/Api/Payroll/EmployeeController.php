<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\Payroll\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(private readonly PayrollService $payroll) {}

    /** GET /api/payroll/employees */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $paginator = Employee::where('company_id', $companyId)
            ->when($request->get('status'),  fn($q, $v) => $q->where('status', $v))
            ->when($request->get('search'),  function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    $q->where('first_name', 'like', "%{$s}%")
                      ->orWhere('last_name',  'like', "%{$s}%")
                      ->orWhere('document_number', 'like', "%{$s}%")
                      ->orWhere('code', 'like', "%{$s}%");
                });
            })
            ->orderBy('last_name')
            ->paginate($request->get('per_page', 25));

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    /** GET /api/payroll/employees/{employee} */
    public function show(Employee $employee): JsonResponse
    {
        return response()->json([
            'data' => array_merge($employee->toArray(), [
                'full_name'      => $employee->full_name,
                'years_of_service' => $employee->years_of_service,
                'social_benefits'  => $this->payroll->getSocialBenefits($employee),
            ]),
        ]);
    }

    /** POST /api/payroll/employees */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'                 => 'nullable|string|max:20',
            'first_name'           => 'required|string|max:100',
            'last_name'            => 'required|string|max:100',
            'document_type'        => 'required|in:CC,CE,PA,TI',
            'document_number'      => 'required|string|max:20',
            'email'                => 'nullable|email|max:150',
            'phone'                => 'nullable|string|max:20',
            'birth_date'           => 'nullable|date',
            'hire_date'            => 'required|date',
            'contract_type'        => 'required|in:indefinido,fijo,obra_labor,aprendizaje',
            'position'             => 'nullable|string|max:100',
            'department'           => 'nullable|string|max:100',
            'base_salary'          => 'required|numeric|min:0',
            'eps_name'             => 'nullable|string|max:100',
            'afp_name'             => 'nullable|string|max:100',
            'arl_name'             => 'nullable|string|max:100',
            'arl_risk_level'       => 'nullable|integer|between:1,5',
            'compensation_fund'    => 'nullable|string|max:100',
            'bank_name'            => 'nullable|string|max:100',
            'bank_account_number'  => 'nullable|string|max:30',
            'bank_account_type'    => 'nullable|in:ahorros,corriente',
            'notes'                => 'nullable|string|max:500',
        ]);

        $validated['company_id'] = auth()->user()->company_id;

        $employee = Employee::create($validated);

        return response()->json(['data' => $employee], 201);
    }

    /** PUT /api/payroll/employees/{employee} */
    public function update(Request $request, Employee $employee): JsonResponse
    {
        $validated = $request->validate([
            'code'                 => 'nullable|string|max:20',
            'first_name'           => 'sometimes|required|string|max:100',
            'last_name'            => 'sometimes|required|string|max:100',
            'document_type'        => 'sometimes|required|in:CC,CE,PA,TI',
            'document_number'      => 'sometimes|required|string|max:20',
            'email'                => 'nullable|email|max:150',
            'phone'                => 'nullable|string|max:20',
            'birth_date'           => 'nullable|date',
            'hire_date'            => 'sometimes|required|date',
            'termination_date'     => 'nullable|date',
            'contract_type'        => 'sometimes|required|in:indefinido,fijo,obra_labor,aprendizaje',
            'position'             => 'nullable|string|max:100',
            'department'           => 'nullable|string|max:100',
            'base_salary'          => 'sometimes|required|numeric|min:0',
            'eps_name'             => 'nullable|string|max:100',
            'afp_name'             => 'nullable|string|max:100',
            'arl_name'             => 'nullable|string|max:100',
            'arl_risk_level'       => 'nullable|integer|between:1,5',
            'compensation_fund'    => 'nullable|string|max:100',
            'bank_name'            => 'nullable|string|max:100',
            'bank_account_number'  => 'nullable|string|max:30',
            'bank_account_type'    => 'nullable|in:ahorros,corriente',
            'status'               => 'nullable|in:activo,inactivo,retirado',
            'notes'                => 'nullable|string|max:500',
        ]);

        $employee->update($validated);

        return response()->json(['data' => $employee->fresh()]);
    }

    /** DELETE /api/payroll/employees/{employee} */
    public function destroy(Employee $employee): JsonResponse
    {
        $employee->delete();
        return response()->json(['message' => 'Empleado eliminado correctamente.']);
    }
}
