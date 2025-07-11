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
        Schema::table('users', function (Blueprint $table) {
            $table->string('chargebee_subscription_id')->nullable()->after('avatar_uuid');
            $table->string('chargebee_customer_id')->nullable()->after('chargebee_subscription_id');
            $table->string('subscription_status')->default('active')->after('chargebee_customer_id');
            $table->timestamp('subscribed_at')->nullable()->after('subscription_status');
            
            // Add indexes for better query performance
            $table->index('chargebee_subscription_id');
            $table->index('chargebee_customer_id');
            $table->index('subscription_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['chargebee_subscription_id']);
            $table->dropIndex(['chargebee_customer_id']);
            $table->dropIndex(['subscription_status']);
            
            $table->dropColumn([
                'chargebee_subscription_id',
                'chargebee_customer_id', 
                'subscription_status',
                'subscribed_at'
            ]);
        });
    }
};
