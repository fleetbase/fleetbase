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
            $table->engine = 'InnoDB';
            $table->increments('id');
            $table->uuid('company_uuid'); // Add the column first
            $table->uuid('user_uuid'); // Add the column first
            $table->unsignedInteger('plan_pricing_id'); // Add this field
            $table->integer('no_of_web_users');
            $table->integer('no_of_app_users');
            $table->decimal('total_amount', 10, 2);
            $table->timestamp('cancelled_at')->nullable();
            $table->json('cancellation_reason')->nullable();
            $table->boolean('auto_renew')->default(false); // Fixed: is_bool() -> boolean()
            $table->timestamp('expires_at');
            $table->enum('status', ['pending','active','expired','cancelled','suspended'])->default('pending');
            $table->unsignedInteger('created_by_id')->nullable();
            $table->unsignedInteger('updated_by_id')->nullable(); 
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
            
            // Foreign keys
            $table->foreign('company_uuid')->references('uuid')->on('companies')->onDelete('cascade');
            $table->foreign('user_uuid')->references('uuid')->on('users')->onDelete('cascade');
            $table->foreign('plan_pricing_id')->references('id')->on('plan_pricing_relation');
            $table->foreign('created_by_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            $table->foreign('updated_by_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
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
