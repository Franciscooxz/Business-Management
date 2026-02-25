<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\CurrencyController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\PurchaseOrderController;
// ERP Modules
use App\Http\Controllers\Api\ThirdParty\ThirdPartyController;
use App\Http\Controllers\Api\Accounting\PucAccountController;
use App\Http\Controllers\Api\Accounting\VoucherController;
use App\Http\Controllers\Api\Inventory\KardexController;
use App\Http\Controllers\Api\ElectronicInvoice\ElectronicInvoiceController;
use App\Http\Controllers\Api\ElectronicInvoice\DianResolutionController;
use App\Http\Controllers\Api\Treasury\BankAccountController;
use App\Http\Controllers\Api\Treasury\TreasuryMovementController;
use App\Http\Controllers\Api\Treasury\AccountsReceivableController;
use App\Http\Controllers\Api\Treasury\AccountsPayableController;
use App\Http\Controllers\Api\Payroll\EmployeeController;
use App\Http\Controllers\Api\Payroll\PayrollPeriodController;
use App\Http\Controllers\Api\Payroll\PayrollSettingController;
use App\Http\Controllers\Api\Tax\TaxConceptController;
use App\Http\Controllers\Api\Tax\TaxDeclarationController;
use App\Http\Controllers\Api\Tax\WithholdingController;

// Rutas públicas
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Rutas protegidas
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // Autenticación
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/statistics', [DashboardController::class, 'statistics']);
    
    // Customers
    Route::get('customers/{id}/sales', [CustomerController::class, 'sales']);
    Route::apiResource('customers', CustomerController::class);

    // Suppliers
    Route::post('suppliers/{id}/attach-products', [SupplierController::class, 'attachProducts']);
    Route::delete('suppliers/{supplierId}/products/{productId}', [SupplierController::class, 'detachProduct']);
    Route::apiResource('suppliers', SupplierController::class);

    // Purchase Orders
    Route::post('purchase-orders/{id}/receive', [PurchaseOrderController::class, 'receive']);
    Route::post('purchase-orders/{id}/cancel', [PurchaseOrderController::class, 'cancel']);
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->except(['update']);

    // Sales
    Route::get('sales-statistics', [SaleController::class, 'statistics']);
    Route::post('sales/{id}/cancel', [SaleController::class, 'cancel']);
    Route::apiResource('sales', SaleController::class)->except(['update']);
    
    // Categorías (todos pueden ver, solo admin puede crear/editar/eliminar)
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);

    // Currencies
    Route::get('currencies/base', [CurrencyController::class, 'base']);
    Route::get('currencies/last-update', [CurrencyController::class, 'lastUpdate']);
    Route::post('currencies/convert', [CurrencyController::class, 'convert']);
    Route::post('currencies/update-rates', [CurrencyController::class, 'updateRatesFromAPI']);
    Route::post('currencies/{id}/update-rate', [CurrencyController::class, 'updateRate']);
    Route::apiResource('currencies', CurrencyController::class);
    
    // Categorías (Solo Admin)
    Route::middleware('role:admin')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    });
    
    // Usuarios (Solo Admin)
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
    });
    
    // PRODUCTOS - EXPORTAR DEBE IR PRIMERO
    Route::get('products/export', [ProductController::class, 'export']);
    
    // Productos CRUD
    Route::apiResource('products', ProductController::class);
    
    // Productos eliminados (Solo Admin)
    Route::middleware('role:admin')->group(function () {
        Route::get('products/trashed/list', [ProductController::class, 'trashed']);
        Route::post('products/{id}/restore', [ProductController::class, 'restore']);
        Route::delete('products/{id}/force', [ProductController::class, 'forceDelete']);
    });
    
    // MOVIMIENTOS DE STOCK
    Route::get('products/{id}/stock-movements', [StockMovementController::class, 'getProductMovements']);
    Route::post('products/{id}/stock-movements', [StockMovementController::class, 'createMovement']);

    // Movimientos de stock - Admin
    Route::middleware('role:admin')->group(function () {
        Route::get('stock-movements', [StockMovementController::class, 'index']);
        Route::get('stock-movements/export', [StockMovementController::class, 'export']);
    });

    // =========================================================================
    // ERP: TERCEROS
    // =========================================================================
    Route::get('third-parties/search', [ThirdPartyController::class, 'search']);
    Route::apiResource('third-parties', ThirdPartyController::class);

    // =========================================================================
    // ERP: CONTABILIDAD
    // =========================================================================
    Route::prefix('accounting')->group(function () {
        // Plan Unico de Cuentas
        Route::get('puc/tree', [PucAccountController::class, 'tree']);
        Route::apiResource('puc', PucAccountController::class)->except(['destroy']);

        // Comprobantes
        Route::post('vouchers/{voucher}/post', [VoucherController::class, 'post']);
        Route::post('vouchers/{voucher}/reverse', [VoucherController::class, 'reverse']);
        Route::apiResource('vouchers', VoucherController::class)->except(['update', 'destroy']);
    });

    // =========================================================================
    // ERP: INVENTARIO — KARDEX
    // =========================================================================
    Route::prefix('inventory')->group(function () {
        // Tarjeta Kardex de un producto
        Route::get('kardex/{productId}', [KardexController::class, 'show']);

        // Lista global de movimientos
        Route::get('movements', [KardexController::class, 'index']);
        Route::post('movements', [KardexController::class, 'store']);
        Route::get('movements/types', [KardexController::class, 'types']);

        // Alertas de stock
        Route::get('stock-alerts', [KardexController::class, 'stockAlerts']);
    });

    // =========================================================================
    // ERP: FACTURACIÓN ELECTRÓNICA DIAN
    // =========================================================================
    Route::prefix('electronic-invoices')->group(function () {
        // Estadísticas (antes del apiResource para evitar conflicto con {id})
        Route::get('stats', [ElectronicInvoiceController::class, 'stats']);

        // Acciones sobre una factura
        Route::post('{electronicInvoice}/generate-xml',  [ElectronicInvoiceController::class, 'generateXml']);
        Route::post('{electronicInvoice}/send',          [ElectronicInvoiceController::class, 'send']);
        Route::post('{electronicInvoice}/check-status',  [ElectronicInvoiceController::class, 'checkStatus']);
        Route::post('{electronicInvoice}/cancel',        [ElectronicInvoiceController::class, 'cancel']);
        Route::get('{electronicInvoice}/download-xml',   [ElectronicInvoiceController::class, 'downloadXml']);

        // CRUD base
        Route::apiResource('/', ElectronicInvoiceController::class)
            ->parameters(['' => 'electronicInvoice'])
            ->except(['update']);
        Route::put('{electronicInvoice}', [ElectronicInvoiceController::class, 'update']);
    });

    // ── Resoluciones DIAN ────────────────────────────────────────────────────
    Route::prefix('dian/resolutions')->group(function () {
        Route::post('{resolution}/activate', [DianResolutionController::class, 'activate']);
        Route::apiResource('/', DianResolutionController::class)
            ->parameters(['' => 'resolution']);
    });

    // =========================================================================
    // ERP: TESORERÍA
    // =========================================================================
    Route::prefix('treasury')->group(function () {

        // ── Cuentas Bancarias ─────────────────────────────────────────────────
        Route::get('bank-accounts/{bankAccount}/movements', [BankAccountController::class, 'movements']);
        Route::get('bank-accounts/{bankAccount}/summary',   [BankAccountController::class, 'summary']);
        Route::apiResource('bank-accounts', BankAccountController::class);

        // ── Movimientos de Tesorería ──────────────────────────────────────────
        Route::get('movements/types',           [TreasuryMovementController::class, 'types']);
        Route::get('movements/cash-flow',       [TreasuryMovementController::class, 'cashFlow']);
        Route::post('movements/{movement}/reverse', [TreasuryMovementController::class, 'reverse']);
        Route::apiResource('movements', TreasuryMovementController::class)->except(['update', 'destroy']);

        // ── Cuentas por Cobrar ────────────────────────────────────────────────
        Route::get('accounts-receivable/aging',          [AccountsReceivableController::class, 'aging']);
        Route::post('accounts-receivable/{accountsReceivable}/pay', [AccountsReceivableController::class, 'pay']);
        Route::apiResource('accounts-receivable', AccountsReceivableController::class)->except(['update', 'destroy']);

        // ── Cuentas por Pagar ─────────────────────────────────────────────────
        Route::get('accounts-payable/aging',             [AccountsPayableController::class, 'aging']);
        Route::post('accounts-payable/{accountsPayable}/pay', [AccountsPayableController::class, 'pay']);
        Route::apiResource('accounts-payable', AccountsPayableController::class)->except(['update', 'destroy']);
    });

    // =========================================================================
    // ERP: NÓMINA
    // =========================================================================
    Route::prefix('payroll')->group(function () {

        // ── Constantes de nómina ──────────────────────────────────────────────
        Route::get('constants', [PayrollPeriodController::class, 'constants']);

        // ── Configuración (SMMLV por año) ─────────────────────────────────────
        Route::post('settings/{setting}/activate', [PayrollSettingController::class, 'activate']);
        Route::apiResource('settings', PayrollSettingController::class)->except(['show']);

        // ── Empleados ─────────────────────────────────────────────────────────
        Route::apiResource('employees', EmployeeController::class);

        // ── Períodos de nómina ────────────────────────────────────────────────
        Route::post('periods/{period}/calculate',            [PayrollPeriodController::class, 'calculate']);
        Route::patch('periods/{period}/items/{item}',        [PayrollPeriodController::class, 'updateItem']);
        Route::post('periods/{period}/cancel',               [PayrollPeriodController::class, 'cancel']);
        Route::apiResource('periods', PayrollPeriodController::class)->except(['update', 'destroy']);
    });

    // =========================================================================
    // ERP: IMPUESTOS
    // =========================================================================
    Route::prefix('taxes')->group(function () {

        // ── Conceptos tributarios (ReteFuente, IVA, ICA…) ─────────────────────
        Route::apiResource('concepts', TaxConceptController::class)->except(['show']);

        // ── Retenciones (entradas individuales) ───────────────────────────────
        // Rutas específicas ANTES del apiResource para evitar conflictos con {withholdingEntry}
        Route::get('withholding/summary',                     [WithholdingController::class, 'summary']);
        Route::get('withholding/certificate/{thirdPartyId}',  [WithholdingController::class, 'certificate']);
        Route::get('withholding/exogenous',                   [WithholdingController::class, 'exogenous']);
        Route::apiResource('withholding', WithholdingController::class)->except(['show']);

        // ── Declaraciones tributarias ─────────────────────────────────────────
        Route::post('declarations/{taxDeclaration}/calculate', [TaxDeclarationController::class, 'calculate']);
        Route::post('declarations/{taxDeclaration}/present',   [TaxDeclarationController::class, 'present']);
        Route::post('declarations/{taxDeclaration}/pay',       [TaxDeclarationController::class, 'pay']);
        Route::apiResource('declarations', TaxDeclarationController::class)->except(['update', 'destroy']);
    });
});