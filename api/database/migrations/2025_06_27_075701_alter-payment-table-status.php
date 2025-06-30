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
        // Check if status column exists
        if (Schema::hasColumn('payments', 'status')) {
            // Column exists, let's modify it
            
            Schema::table('payments', function (Blueprint $table) {
                // Add temporary backup column
                $table->string('status_backup')->nullable();
            });

            // Copy existing data
            DB::statement('UPDATE payments SET status_backup = status');

            Schema::table('payments', function (Blueprint $table) {
                // Drop existing status column
                $table->dropColumn('status');
            });
        }

        // Add the new status column (whether it existed before or not)
        Schema::table('payments', function (Blueprint $table) {
            $table->enum('status', [
                'pending',
                'mandate_pending', 
                'mandate_approved', 
                'mandate_failed', 
                'mandate_cancelled',
                'processing',
                'subscription_creating',
                'completed',
                'subscription_active',
                'subscription_paused',
                'failed',
                'payment_failed',
                'insufficient_funds',
                'cancelled',
                'subscription_cancelled',
                'subscription_expired',
                'refunded',
                'partially_refunded',
                'disputed',
                'on_hold',
                'expired'
            ])->default('pending');
        });

        // If we had backup data, restore it
        if (Schema::hasColumn('payments', 'status_backup')) {
            DB::statement('UPDATE payments SET status = status_backup WHERE status_backup IS NOT NULL');
            
            Schema::table('payments', function (Blueprint $table) {
                $table->dropColumn('status_backup');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
