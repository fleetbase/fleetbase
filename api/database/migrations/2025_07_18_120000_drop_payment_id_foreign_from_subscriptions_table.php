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
        Schema::table('subscriptions', function (Blueprint $table) {
            // Drop the foreign key constraint for payment_id
            $table->dropForeign(['payment_id']);

            // Make the column nullable
            $table->unsignedInteger('payment_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // Re-add the foreign key constraint for payment_id
            $table->foreign('payment_id')->references('id')->on('payments');
        });
    }
};