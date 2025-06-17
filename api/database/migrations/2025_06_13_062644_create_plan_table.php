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
        Schema::create('plan', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedBigInteger('payment_gateway_id');
            $table->unsignedBigInteger('created_by_id'); // Changed from integer to unsignedBigInteger and removed nullable()
            $table->unsignedBigInteger('updated_by_id'); // Changed from integer to unsignedBigInteger and removed nullable()
            $table->timestamp('created_at');
            $table->timestamp('updated_at');
            $table->tinyInteger('deleted')->default(0); // Changed from boolean to tinyInteger
            $table->tinyInteger('record_status')->default(1); // Changed from boolean to tinyInteger
            
            $table->index('name');
            $table->index(['deleted', 'record_status']);
        });
        
        // Move the foreign key check outside the Schema::create
        if (Schema::hasTable('payment_gateway')) {
            Schema::table('plan', function (Blueprint $table) {
                $table->foreign('payment_gateway_id')->references('id')->on('payment_gateway');
            });
        }
    }

    public function down(): void
    {
        // Drop foreign key first, then table
        if (Schema::hasTable('plan')) {
            Schema::table('plan', function (Blueprint $table) {
                $table->dropForeign(['payment_gateway_id']);
            });
        }
        
        Schema::dropIfExists('plan');
    }
};
