<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        
        Schema::create('plan', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->increments('id'); // Keep as increments (int unsigned)
            $table->string('name');
            $table->unsignedInteger('payment_gateway_id'); // Changed to unsignedInteger to match payment_gateway.id
            $table->unsignedInteger('created_by_id')->nullable(); // Changed to unsignedInteger
            $table->unsignedInteger('updated_by_id')->nullable(); // Changed to unsignedInteger
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
            
            $table->index('name');
            $table->index(['deleted', 'record_status']);
            
            // Add foreign key constraint directly
            $table->foreign('payment_gateway_id')->references('id')->on('payment_gateway');
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

    public function down(): void
    {
        Schema::dropIfExists('plan');
    }
};