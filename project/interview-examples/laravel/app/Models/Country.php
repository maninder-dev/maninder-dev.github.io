<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

/** Topic 27 / 95: countries -> users -> posts/orders through the middle table. */
class Country extends Model
{
    public $timestamps = false;

    protected $fillable = ['name'];

    public function posts(): HasManyThrough
    {
        return $this->hasManyThrough(Post::class, User::class);
    }

    public function orders(): HasManyThrough
    {
        return $this->hasManyThrough(Order::class, User::class);
    }
}
