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
        Schema::create('processed_webhooks', function (Blueprint $table) {
            $table->id();
            $table->string('webhook_id')->nullable();
            $table->string('event_id')->nullable();
            $table->timestamp('processed_at');
            $table->index(['webhook_id', 'event_id']);
            $table->json('event_data')->nullable();
            $table->unsignedInteger('created_by_id')->nullable();
            $table->unsignedInteger('updated_by_id')->nullable(); 
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->tinyInteger('deleted')->default(0);
            $table->tinyInteger('record_status')->default(1);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('processed_webhooks');
    }
};
