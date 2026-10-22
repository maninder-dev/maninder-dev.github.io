<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/** Topic 87: reusable model behaviour. boot<TraitName>() runs automatically when the model boots. */
trait HasUuid
{
    protected static function bootHasUuid(): void
    {
        static::creating(fn ($model) => $model->uuid ??= (string) Str::uuid());
    }
}
