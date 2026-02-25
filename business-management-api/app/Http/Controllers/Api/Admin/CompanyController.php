<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * CompanyController — solo accesible para super_admin
 * Gestión global de empresas del SaaS Adminova
 */
class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $query = Company::withCount('users');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre_comercial', 'like', "%{$search}%")
                  ->orWhere('razon_social', 'like', "%{$search}%")
                  ->orWhere('nit', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('plan')) {
            $query->where('plan', $request->plan);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $companies = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $companies->map(fn($c) => $this->formatCompany($c)),
            'pagination' => [
                'current_page' => $companies->currentPage(),
                'last_page'    => $companies->lastPage(),
                'per_page'     => $companies->perPage(),
                'total'        => $companies->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre_comercial' => 'required|string|max:200',
            'razon_social'     => 'required|string|max:200',
            'nit'              => 'required|string|max:20|unique:companies,nit',
            'nit_dv'           => 'nullable|string|max:2',
            'email'            => 'nullable|email|max:150',
            'phone'            => 'nullable|string|max:20',
            'address'          => 'nullable|string|max:300',
            'city'             => 'nullable|string|max:100',
            'department'       => 'nullable|string|max:100',
            'plan'             => 'nullable|in:basico,profesional,empresarial',
            'tipo_persona'     => 'nullable|in:natural,juridica',
            'regimen_tributario' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $company = Company::create([
            'nombre_comercial'    => $request->nombre_comercial,
            'razon_social'        => $request->razon_social,
            'nit'                 => $request->nit,
            'nit_dv'              => $request->nit_dv,
            'email'               => $request->email,
            'phone'               => $request->phone,
            'address'             => $request->address,
            'city'                => $request->city,
            'department'          => $request->department,
            'plan'                => $request->plan ?? 'basico',
            'tipo_persona'        => $request->tipo_persona ?? 'juridica',
            'regimen_tributario'  => $request->regimen_tributario,
            'is_active'           => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Empresa creada exitosamente.',
            'data'    => $this->formatCompany($company->loadCount('users')),
        ], 201);
    }

    public function show(string $id)
    {
        $company = Company::withCount('users')->findOrFail($id);

        // Incluir usuarios de la empresa
        $users = User::where('company_id', $company->id)
            ->with('roles')
            ->select(['id', 'name', 'email', 'is_active', 'created_at', 'role_id'])
            ->get()
            ->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'role'       => $u->roles->first()?->name ?? $u->role?->name ?? '—',
                'is_active'  => $u->is_active,
                'created_at' => $u->created_at,
            ]);

        return response()->json([
            'success' => true,
            'data'    => array_merge($this->formatCompany($company), ['users' => $users]),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $company = Company::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre_comercial' => 'sometimes|string|max:200',
            'razon_social'     => 'sometimes|string|max:200',
            'nit'              => 'sometimes|string|max:20|unique:companies,nit,' . $id,
            'nit_dv'           => 'nullable|string|max:2',
            'email'            => 'nullable|email|max:150',
            'phone'            => 'nullable|string|max:20',
            'address'          => 'nullable|string|max:300',
            'city'             => 'nullable|string|max:100',
            'department'       => 'nullable|string|max:100',
            'plan'             => 'nullable|in:basico,profesional,empresarial',
            'tipo_persona'     => 'nullable|in:natural,juridica',
            'regimen_tributario' => 'nullable|string|max:50',
            'is_active'        => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $company->update($request->only([
            'nombre_comercial', 'razon_social', 'nit', 'nit_dv',
            'email', 'phone', 'address', 'city', 'department',
            'plan', 'tipo_persona', 'regimen_tributario', 'is_active',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Empresa actualizada.',
            'data'    => $this->formatCompany($company->loadCount('users')),
        ]);
    }

    public function toggleActive(string $id)
    {
        $company = Company::findOrFail($id);
        $company->update(['is_active' => ! $company->is_active]);

        $status = $company->is_active ? 'activada' : 'desactivada';

        return response()->json([
            'success'   => true,
            'message'   => "Empresa {$status}.",
            'is_active' => $company->is_active,
        ]);
    }

    public function stats()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'total'        => Company::count(),
                'active'       => Company::where('is_active', true)->count(),
                'inactive'     => Company::where('is_active', false)->count(),
                'by_plan'      => [
                    'basico'       => Company::where('plan', 'basico')->count(),
                    'profesional'  => Company::where('plan', 'profesional')->count(),
                    'empresarial'  => Company::where('plan', 'empresarial')->count(),
                ],
                'total_users'  => User::whereNotNull('company_id')->count(),
            ],
        ]);
    }

    private function formatCompany(Company $company): array
    {
        return [
            'id'               => $company->id,
            'nombre_comercial' => $company->nombre_comercial,
            'razon_social'     => $company->razon_social,
            'nit'              => $company->nit,
            'nit_dv'           => $company->nit_dv,
            'nit_formatted'    => $company->nit_formatted,
            'email'            => $company->email,
            'phone'            => $company->phone,
            'address'          => $company->address,
            'city'             => $company->city,
            'department'       => $company->department,
            'plan'             => $company->plan ?? 'basico',
            'tipo_persona'     => $company->tipo_persona,
            'regimen_tributario' => $company->regimen_tributario,
            'is_active'        => $company->is_active,
            'users_count'      => $company->users_count ?? 0,
            'created_at'       => $company->created_at,
            'updated_at'       => $company->updated_at,
        ];
    }
}
