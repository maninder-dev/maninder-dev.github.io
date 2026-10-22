<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Topic 35: Migrations. The orders table from the handbook, plus columns used by later topics.
 * Difference from the PDF: total is an integer in paise (cast to a Money value object, Topic 87).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('pending')->index();
            $table->unsignedBigInteger('total')->default(0);      // paise
            $table->json('meta')->nullable();
            $table->string('idempotency_key')->nullable()->unique(); // Topic 102
            $table->foreignId('product_id')->nullable()->constrained();
            $table->unsignedInteger('qty')->default(1);
            $table->string('invoice_path')->nullable();             // Topic 58
            $table->string('awb')->nullable();                      // Topic 98
            $table->timestamps();
            $table->softDeletes();                                  // Topic 70: assertSoftDeleted
            $table->index(['user_id', 'created_at']);               // composite index
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained();
            $table->unsignedInteger('price');                      // price_at_purchase, paise
            $table->unsignedInteger('qty');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
