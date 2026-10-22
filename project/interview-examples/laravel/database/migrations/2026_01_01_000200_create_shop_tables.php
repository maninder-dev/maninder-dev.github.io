<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Shop tables: vendors, products, seats, campaigns, invoices.
 * Money is stored as integer paise (see App\ValueObjects\Money and App\Casts\MoneyCast).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('name');
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->nullable()->constrained();
            $table->foreignId('category_id')->nullable()->constrained();
            $table->string('sku')->unique();
            $table->string('name');
            $table->unsignedInteger('price');                 // paise
            $table->unsignedInteger('stock')->default(0);
            $table->timestamps();
        });

        // Topic 40: atomic conditional update ("who booked the seat first")
        Schema::create('seats', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->foreignId('booked_by')->nullable()->constrained('users');
        });

        // Topic 103: one row per (campaign, user) so retries never double-send
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('subject');
            $table->timestamps();
        });
        Schema::create('campaign_sends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['campaign_id', 'user_id']);
        });

        // Topics 56, 64, 87, 96: invoices (signed download, notification, HasUuid trait)
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained();
            $table->string('number');
            $table->unsignedInteger('amount');
            $table->string('pdf_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['invoices', 'campaign_sends', 'campaigns', 'seats', 'products', 'vendors'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
