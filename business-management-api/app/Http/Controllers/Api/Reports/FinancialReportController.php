<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Services\Reports\BalanceSheetService;
use App\Services\Reports\FinancialRatiosService;
use App\Services\Reports\IncomeStatementService;
use App\Services\Reports\LedgerService;
use App\Services\Reports\TrialBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialReportController extends Controller
{
    public function __construct(
        private readonly TrialBalanceService    $trialBalance,
        private readonly BalanceSheetService    $balanceSheet,
        private readonly IncomeStatementService $incomeStatement,
        private readonly LedgerService          $ledger,
        private readonly FinancialRatiosService $ratios,
    ) {}

    // ── GET /api/reports/trial-balance ────────────────────────────────────────
    public function trialBalance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date'          => 'required|date',
            'end_date'            => 'required|date|after_or_equal:start_date',
            'only_with_movements' => 'boolean',
        ]);

        $companyId = auth()->user()->company_id;

        $data = $this->trialBalance->generate(
            $companyId,
            $validated['start_date'],
            $validated['end_date'],
            $request->boolean('only_with_movements', true)
        );

        return response()->json(['data' => $data]);
    }

    // ── GET /api/reports/balance-sheet ────────────────────────────────────────
    public function balanceSheet(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'as_of_date'    => 'required|date',
            'period_start'  => 'required|date',
        ]);

        $companyId = auth()->user()->company_id;

        $data = $this->balanceSheet->generate(
            $companyId,
            $validated['as_of_date'],
            $validated['period_start']
        );

        return response()->json(['data' => $data]);
    }

    // ── GET /api/reports/income-statement ─────────────────────────────────────
    public function incomeStatement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
        ]);

        $companyId = auth()->user()->company_id;

        $data = $this->incomeStatement->generate(
            $companyId,
            $validated['start_date'],
            $validated['end_date']
        );

        return response()->json(['data' => $data]);
    }

    // ── GET /api/reports/general-ledger ───────────────────────────────────────
    public function generalLedger(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => 'required|integer|exists:puc_accounts,id',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
        ]);

        $companyId = auth()->user()->company_id;

        $data = $this->ledger->getLedger(
            $companyId,
            (int) $validated['account_id'],
            $validated['start_date'],
            $validated['end_date']
        );

        return response()->json(['data' => $data]);
    }

    // ── GET /api/reports/journal ──────────────────────────────────────────────
    public function journal(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'voucher_type' => 'nullable|string',
            'search'       => 'nullable|string|max:100',
        ]);

        $companyId = auth()->user()->company_id;

        $data = $this->ledger->getJournal(
            $companyId,
            $validated['start_date'],
            $validated['end_date'],
            $validated['voucher_type'] ?? null,
            $validated['search']       ?? null
        );

        return response()->json($data);
    }

    // ── GET /api/reports/financial-ratios ─────────────────────────────────────
    public function financialRatios(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
        ]);

        $companyId = auth()->user()->company_id;

        $data = $this->ratios->calculate(
            $companyId,
            $validated['start_date'],
            $validated['end_date']
        );

        return response()->json(['data' => $data]);
    }
}
