<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('waypoints', function (Blueprint $table) {
            $table->string('customer_type')->nullable()->after('tracking_number_uuid');
            $table->uuid('customer_uuid')->nullable()->after('tracking_number_uuid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('waypoints', function (Blueprint $table) {
            $table->dropColumn(['customer_uuid', 'customer_type']);
        });
    }
};
