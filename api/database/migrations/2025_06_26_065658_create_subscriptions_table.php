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
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->increments('id');
            $table->uuid('company_uuid'); // Add the column first
            $table->uuid('user_uuid'); 
            $table->unsignedInteger('payment_id');
            $table->string('gocardless_subscription_id')->unique();
            $table->string('gocardless_mandate_id');
            $table->enum('interval_unit', ['weekly', 'monthly', 'yearly']);
            $table->integer('interval')->default(1);
            $table->integer('day_of_month')->nullable();
            
            // Status and Timing
            $table->enum('status', [
                'pending_customer_approval',
                'customer_approval_denied',
                'active',
                'finished',
                'cancelled',
                'paused'
            ]);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            
            // Billing Flow Information
            $table->string('billing_request_id')->nullable();
            $table->string('billing_request_flow_id')->nullable();
            
            // Payment Details
            $table->integer('upcoming_payments_count')->default(0);
            $table->string('payment_reference')->nullable();
            
            // Metadata
            $table->json('metadata')->nullable();
            
            // Audit Fields
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->unsignedInteger('created_by_id')->nullable();
            $table->unsignedInteger('updated_by_id')->nullable(); 
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->nullable()->useCurrentOnUpdate();
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
            // Foreign key constraint
            $table->foreign('company_uuid')->references('uuid')->on('companies')->onDelete('cascade');
            $table->foreign('user_uuid')->references('uuid')->on('users')->onDelete('cascade');
            $table->foreign('payment_id')->references('id')->on('payments');
            $table->foreign('created_by_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            $table->foreign('updated_by_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            // Indexes
            $table->index(['deleted', 'record_status']);
            $table->index(['user_uuid', 'status', 'company_uuid']);
            $table->index(['billing_request_flow_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
