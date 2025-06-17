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
            $table->engine = 'InnoDB';
            $table->increments('id');
            $table->unsignedInteger('payment_id');
            $table->string('event_type');
            $table->text('event_data');
            $table->timestamp('event_date');
            $table->string('gateway_event_id');
            $table->string('event_status');
            $table->text('error_message');
            $table->unsignedInteger('created_by_id')->nullable();
            $table->unsignedInteger('updated_by_id')->nullable(); 
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
            
            // Foreign key constraint
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
