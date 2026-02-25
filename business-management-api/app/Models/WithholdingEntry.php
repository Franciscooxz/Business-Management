<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WithholdingEntry extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id',
        'tax_concept_id',
        'tax_declaration_id',
        'third_party_id',
        'document_number',
        'document_date',
        'reference',
        'base_amount',
        'rate',
        'tax_amount',
        'direction',
        'notes',
    ];

    protected $casts = [
        'document_date' => 'date',
        'base_amount'   => 'decimal:2',
        'rate'          => 'decimal:4',
        'tax_amount'    => 'decimal:2',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function concept(): BelongsTo
    {
        return $this->belongsTo(TaxConcept::class, 'tax_concept_id');
    }

    public function declaration(): BelongsTo
    {
        return $this->belongsTo(TaxDeclaration::class, 'tax_declaration_id');
    }

    public function thirdParty(): BelongsTo
    {
        return $this->belongsTo(ThirdParty::class, 'third_party_id');
    }
}
