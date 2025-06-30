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
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedInteger('subscription_id')->nullable()->after('id');
            
            // Add foreign key constraint to subscriptions table
            $table->foreign('subscription_id')
                  ->references('id')
                  ->on('subscriptions')
                  ->onDelete('cascade');
                  
            // Add index for better query performance
            $table->index(['subscription_id'], 'idx_payments_subscription_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['subscription_id']);
            
            // Drop index
            $table->dropIndex('idx_payments_subscription_id');
            
            // Drop the column
            $table->dropColumn('subscription_id');
        });
    }
};
