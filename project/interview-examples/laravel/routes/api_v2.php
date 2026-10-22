<?php

use App\Http\Controllers\Api\V2\OrderController;
use Illuminate\Support\Facades\Route;

// Topic 81: v2 routes live in their own file, mounted under /api/v2.
Route::get('/orders', [OrderController::class, 'index']);
