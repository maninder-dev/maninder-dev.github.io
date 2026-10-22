<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    public $timestamps = false;

    protected $fillable = ['name', 'subdomain'];
}
