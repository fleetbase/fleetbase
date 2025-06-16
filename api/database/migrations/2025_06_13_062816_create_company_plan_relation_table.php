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
        Schema::create('company_plan_relation', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->uuid('company_uuid'); // Add the column first
            $table->uuid('user_uuid'); // Add the column first
            $table->unsignedBigInteger('plan_pricing_id'); // Add this field
            $table->integer('no_of_web_users');
            $table->integer('no_of_app_users');
            $table->decimal('total_amount', 10, 2);
            $table->timestamp('cancelled_at')->nullable();
            $table->json('cancellation_reason')->nullable();
            $table->boolean('auto_renew'); // Fixed: is_bool() -> boolean()
            $table->timestamp('expires_at');
            $table->enum('status', ['pending','active','expired','cancelled','suspended'])->default('pending');
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('updated_by');
            $table->timestamp('created_at');
            $table->timestamp('updated_at');
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
            
            // Foreign keys
            $table->foreign('company_uuid')->references('uuid')->on('companies')->onDelete('cascade');
            $table->foreign('user_uuid')->references('uuid')->on('users')->onDelete('cascade');
            $table->foreign('plan_pricing_id')->references('id')->on('plan_pricing_relation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_plan_relation');
    }
};
