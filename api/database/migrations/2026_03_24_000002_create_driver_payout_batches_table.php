<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('driver_payout_batches', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->uuid('company_uuid')->index();
            $table->uuid('driver_uuid')->index();
            $table->string('currency_code', 10)->default('UGX');
            $table->string('status', 40)->default('queued');
            $table->unsignedBigInteger('gross_earnings')->default(0);
            $table->unsignedInteger('order_count')->default(0);
            $table->timestamp('cycle_started_at')->nullable();
            $table->timestamp('cycle_ended_at')->nullable();
            $table->timestamp('scheduled_for')->nullable();
            $table->timestamp('transferred_at')->nullable();
            $table->json('meta')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_payout_batches');
    }
};
