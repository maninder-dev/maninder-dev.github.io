<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Topics 56 (signed download), 64 (InvoicePaid notification), 87 (HasUuid trait), 96 (private download). */
class Invoice extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'number', 'amount', 'pdf_path'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
