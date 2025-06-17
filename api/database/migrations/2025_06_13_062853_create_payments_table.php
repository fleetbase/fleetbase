<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_plan_id');
            $table->unsignedBigInteger('plan_id');
            $table->enum('payment_type', ['subscription','one_time','setup_fee','upgrade','refund'])->default('one_time');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'])->default('pending'); // Fixed default
            $table->decimal('amount', 10, 2);
            $table->decimal('tax_amount', 10, 2)->nullable();
            $table->decimal('discount_amount', 10, 2)->nullable();
            $table->decimal('total_amount', 10, 2);
            $table->string('gocardless_payment_id')->nullable();
            $table->timestamp('gocardless_charge_date')->nullable();
            $table->enum('payment_method', ['direct_debit','bank_transfer','card'])->default('direct_debit');
            $table->json('payment_metadata')->nullable();
            $table->string('gocardless_customer_id')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->json('failure_reason')->nullable();
            $table->string('checkout_session_id')->nullable();
            $table->string('checkout_redirect_url')->nullable();
            $table->timestamp('checkout_expires_at')->nullable();
            $table->json('refund_details')->nullable();
            $table->string('invoice_number')->nullable();
            $table->timestamp('created_at');
            $table->timestamp('updated_at');
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
            $table->unsignedBigInteger('created_by_id'); // Changed from integer and removed nullable
            $table->unsignedBigInteger('updated_by_id'); // Changed from integer and removed nullable

            // Foreign key constraints - define after all columns
            $table->foreign('company_plan_id')->references('id')->on('company_plan_relation')->onDelete('cascade');
            $table->foreign('plan_id')->references('id')->on('plan')->onDelete('cascade');

            // Indexes
            $table->index('gocardless_payment_id');
            $table->index(['status', 'created_at']);
            $table->index(['deleted', 'record_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
