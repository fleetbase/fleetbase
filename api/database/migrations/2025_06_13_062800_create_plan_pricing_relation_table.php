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
            Schema::create('plan_pricing_relation', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('plan_id'); // Changed from foreignId
            $table->enum('billing_cycle', ['monthly','quarterly','annual'])->default('monthly'); // Fixed typo: quartely -> quarterly
            $table->decimal('price_per_user', 8, 2);
            $table->decimal('price_per_driver', 8, 2);
            $table->string('currency');
            $table->unsignedBigInteger('created_by_id'); // Changed from integer and removed nullable()
            $table->unsignedBigInteger('updated_by_id'); // Changed from integer and removed nullable()
            $table->timestamp('created_at');
            $table->timestamp('updated_at');
            $table->tinyInteger('deleted')->default(0); // Changed from boolean
            $table->tinyInteger('record_status')->default(1); // Changed from boolean
            
            // Add foreign key constraint
            $table->foreign('plan_id')->references('id')->on('plan')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plan_pricing_relation');
    }
};
