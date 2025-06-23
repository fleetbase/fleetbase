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
        Schema::table('payment_events_relation', function (Blueprint $table) {
            // Change event_data from text to json
            $table->json('event_data')->change();
            
            // Change error_message from text to json and make it nullable
            $table->json('error_message')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_events_relation', function (Blueprint $table) {
            // Revert event_data from json back to text
            $table->text('event_data')->change();
            
            // Revert error_message from json back to text (keeping nullable)
            $table->text('error_message')->nullable()->change();
        });
    }
};
