<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Topic 104: multi-vendor marketplace. */
class Vendor extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'name'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
