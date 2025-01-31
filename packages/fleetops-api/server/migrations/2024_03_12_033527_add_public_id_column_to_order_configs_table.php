<?php

use Fleetbase\FleetOps\Models\OrderConfig;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_configs', function (Blueprint $table) {
            $table->string('public_id')->nullable()->after('uuid')->index();
        });

        // Update order configs with a public id
        $orderCofigs = OrderConfig::all();
        foreach ($orderCofigs as $orderCofig) {
            $orderCofig->update(['public_id' => OrderConfig::generatePublicId('order_config')]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_configs', function (Blueprint $table) {
            $table->dropColumn('public_id');
        });
    }
};
