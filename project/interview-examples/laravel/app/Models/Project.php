<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** Topic 88 (tenant global scope via trait) and Topic 95 (pivot with extra columns). */
class Project extends Model
{
    use BelongsToTenant;

    protected $fillable = ['name', 'tenant_id'];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role', 'joined_at');
    }
}
