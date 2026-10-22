<?php

use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\AuthController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Everything here is stateless (no session, no CSRF) and prefixed with /api.

// Topic 96: mobile login issues a Sanctum token
Route::post('/login', [AuthController::class, 'token']);

// Topic 49: protected by a Sanctum token
Route::middleware('auth:sanctum')->get('/user', fn (Request $r) => ['id' => $r->user()->id, 'can_read_orders' => $r->user()->tokenCan('orders:read')]);
Route::middleware('auth:sanctum')->post('/logout', function (Request $r) {
    $r->user()->currentAccessToken()->delete();

    return response()->noContent();
});

// Topic 81: versioned API
Route::prefix('v1')->middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::apiResource('orders', OrderController::class)->only(['index', 'store', 'destroy']);
});
Route::prefix('v2')->middleware(['auth:sanctum', 'throttle:api'])->group(base_path('routes/api_v2.php'));

// Topic 93: a deliberately failing endpoint to show the uniform error shape
Route::get('/boom', fn () => throw new RuntimeException('secret internal detail'));
Route::get('/teapot', fn () => abort(418, 'I am a teapot'));

// Topic 106: "create a user" in six lines: validation, persistence, JSON
Route::post('/users', function (Request $request) {
    $data = $request->validate(['name' => 'required', 'email' => 'required|email|unique:users', 'password' => 'required|min:8']);

    return response()->json(User::create($data), 201);
});
