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
        Schema::table('fleet_drivers', function (Blueprint $table) {
            $table->foreign(['driver_uuid'])->references(['uuid'])->on('drivers')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['fleet_uuid'])->references(['uuid'])->on('fleets')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('fleet_drivers', function (Blueprint $table) {
            $table->dropForeign('fleet_drivers_driver_uuid_foreign');
            $table->dropForeign('fleet_drivers_fleet_uuid_foreign');
        });
    }
};
