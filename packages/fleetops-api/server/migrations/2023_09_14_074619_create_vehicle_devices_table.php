<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up()
    {
        Schema::create('vehicle_devices', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable();
            $table->uuid('vehicle_uuid');
            $table->foreign('vehicle_uuid')->references('uuid')->on('vehicles');
            $table->string('device_id')->nullable();
            $table->string('device_provider')->nullable();
            $table->string('device_type')->nullable();
            $table->string('device_name')->nullable();
            $table->string('device_location')->nullable();
            $table->string('device_model')->nullable();
            $table->string('manufacturer')->nullable();
            $table->string('serial_number')->nullable();
            $table->date('installation_date')->nullable();
            $table->date('last_maintenance_date')->nullable();
            $table->json('meta')->nullable();
            $table->json('data')->nullable();
            $table->boolean('online')->default(0);
            $table->string('status')->nullable();
            $table->string('data_frequency')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::table('vehicle_devices', function (Blueprint $table) {
            $table->dropForeign('vehicle_devices_vehicle_uuid_foreign');
        });
        Schema::dropIfExists('vehicle_devices');
    }
};
