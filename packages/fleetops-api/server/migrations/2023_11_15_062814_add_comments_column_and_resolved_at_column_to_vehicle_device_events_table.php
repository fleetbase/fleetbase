<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('vehicle_device_events', function (Blueprint $table) {
            $table->timestamp('resolved_at')->nullable()->after('reason')->index();
            $table->mediumText('comment')->nullable()->after('reason');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('vehicle_device_events', function (Blueprint $table) {
            $table->dropColumn(['comment', 'resolved_at']);
        });
    }
};
