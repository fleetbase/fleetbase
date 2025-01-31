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
        Schema::table('service_rates', function (Blueprint $table) {
            $table->foreignUuid('order_config_uuid')->nullable()->after('zone_uuid')->references('uuid')->on('order_configs')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_rates', function (Blueprint $table) {
            $table->dropForeign(['order_config_uuid']);
            $table->dropColumn(['order_config_uuid']);
        });
    }
};
