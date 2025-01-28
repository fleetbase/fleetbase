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
        // fix indexes on vehicle_devices table
        Schema::table('vehicle_devices', function (Blueprint $table) {
            $table->index('uuid');
        });

        // create events table
        Schema::create('vehicle_device_events', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable();
            $table->uuid('vehicle_device_uuid');
            $table->foreign('vehicle_device_uuid')->references('uuid')->on('vehicle_devices');
            $table->json('payload')->nullable();
            $table->json('meta')->nullable();
            $table->string('ident')->nullable();
            $table->string('protocol')->nullable();
            $table->string('provider')->nullable();
            $table->point('location')->nullable();
            $table->string('mileage')->nullable();
            $table->string('state')->nullable();
            $table->string('code')->nullable();
            $table->string('reason')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('vehicle_device_events');

        // fix indexes on vehicle_devices table
        Schema::table('vehicle_devices', function (Blueprint $table) {
            $table->dropIndex(['uuid']);
        });
    }
};
