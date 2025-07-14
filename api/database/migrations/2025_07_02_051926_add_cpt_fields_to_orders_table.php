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
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('is_cpt_truck')->default(false);
            $table->uuid('fleet_uuid')->nullable()->index();
            $table->uuid('sub_fleet_uuid')->nullable()->index();
            $table->decimal('estimated_cost', 10, 2)->nullable();

            // Add FK constraint if needed
            $table->foreign('fleet_uuid')->references('uuid')->on('fleets');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
         Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['fleet_uuid']);
            $table->dropColumn(['is_cpt_truck', 'fleet_uuid', 'sub_fleet_uuid', 'estimated_cost']);
        });
    }
};
