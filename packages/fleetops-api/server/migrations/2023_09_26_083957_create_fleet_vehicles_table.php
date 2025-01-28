<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up()
    {
        Schema::create('fleet_vehicles', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->uuid('uuid')->nullable()->index();
            $table->uuid('fleet_uuid')->nullable()->index();
            $table->uuid('vehicle_uuid')->nullable()->index();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['uuid']);

            $table->foreign('fleet_uuid')
                ->references('uuid')
                ->on('fleets')
                ->onDelete('CASCADE')
                ->onUpdate('CASCADE');

            $table->foreign('vehicle_uuid')
                ->references('uuid')
                ->on('vehicles')
                ->onDelete('CASCADE')
                ->onUpdate('CASCADE');
        });
    }

    public function down()
    {
        Schema::table('fleet_vehicles', function (Blueprint $table) {
            $table->dropForeign(['fleet_uuid']);
            $table->dropForeign(['vehicle_uuid']);
        });

        Schema::dropIfExists('fleet_vehicles');
    }
};
