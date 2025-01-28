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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->index();
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('vendor_uuid')->nullable()->index('vehicles_vendor_uuid_foreign');
            $table->uuid('photo_uuid')->nullable()->index('vehicles_photo_uuid_foreign');
            $table->string('avatar_url', 300)->nullable();
            $table->string('make', 191)->nullable()->index();
            $table->string('model', 191)->nullable()->index();
            $table->string('year', 191)->nullable()->index();
            $table->string('trim', 191)->nullable()->index();
            $table->string('model_0_to_100_kph')->nullable();
            $table->string('model_body')->nullable();
            $table->string('model_co2')->nullable();
            $table->string('model_doors')->nullable();
            $table->string('model_drive')->nullable();
            $table->string('model_engine_bore_mm')->nullable();
            $table->string('model_engine_cc')->nullable();
            $table->string('model_engine_compression')->nullable();
            $table->string('model_engine_cyl')->nullable();
            $table->string('model_engine_fuel')->nullable();
            $table->string('model_engine_position')->nullable();
            $table->string('model_engine_power_ps')->nullable();
            $table->string('model_engine_power_rpm')->nullable();
            $table->string('model_engine_stroke_mm')->nullable();
            $table->string('model_engine_torque_nm')->nullable();
            $table->string('model_engine_torque_rpm')->nullable();
            $table->string('model_engine_valves_per_cyl')->nullable();
            $table->string('model_fuel_cap_l')->nullable();
            $table->string('model_length_mm')->nullable();
            $table->string('model_lkm_city')->nullable();
            $table->string('model_lkm_hwy')->nullable();
            $table->string('model_lkm_mixed')->nullable();
            $table->string('model_make_display')->nullable();
            $table->string('model_seats')->nullable();
            $table->string('model_sold_in_us')->nullable();
            $table->string('model_top_speed_kph')->nullable();
            $table->string('model_transmission_type')->nullable();
            $table->string('model_weight_kg')->nullable();
            $table->string('model_wheelbase_mm')->nullable();
            $table->string('model_width_mm')->nullable();
            $table->string('type')->nullable();
            $table->string('plate_number')->nullable();
            $table->string('vin')->nullable();
            $table->mediumText('vin_data')->nullable();
            $table->json('meta')->nullable();
            $table->string('status')->nullable();
            $table->string('slug', 191)->nullable()->index();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['public_id']);
            $table->unique(['uuid']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('vehicles');
    }
};
