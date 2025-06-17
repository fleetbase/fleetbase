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
       Schema::create('payment_events_relation', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payment_id');
            $table->string('event_type');
            $table->text('event_data');
            $table->timestamp('event_date');
            $table->string('gateway_event_id');
            $table->string('event_status');
            $table->text('error_message');
            $table->unsignedBigInteger('created_by_id');
            $table->unsignedBigInteger('updated_by_id');
            $table->timestamp('created_at');
            $table->timestamp('updated_at');
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
            
            // Foreign key constraint
            $table->foreign('payment_id')->references('id')->on('payments');
            
            // Indexes
            $table->index(['deleted', 'record_status']);
            $table->index('event_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_events_relation');
    }
};
