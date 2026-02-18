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
});