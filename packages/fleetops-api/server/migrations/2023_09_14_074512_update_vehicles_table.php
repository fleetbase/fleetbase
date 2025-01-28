<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up()
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'location')) {
                $table->point('location')->nullable()->after('avatar_url');
            }

            if (!Schema::hasColumn('vehicles', 'model')) {
                $table->string('model')->nullable()->after('make');
            }
            if (!Schema::hasColumn('vehicles', 'model_data')) {
                $table->json('model_data')->nullable()->after('meta');
            }
            if (!Schema::hasColumn('vehicles', 'telematics')) {
                $table->json('telematics')->nullable()->after('meta');
            }

            $table->dropColumn([
                'model_0_to_100_kph',
                'model_body',
                'model_co2',
                'model_doors',
                'model_drive',
                'model_engine_bore_mm',
                'model_engine_cc',
                'model_engine_compression',
                'model_engine_cyl',
                'model_engine_fuel',
                'model_engine_position',
                'model_engine_power_ps',
                'model_engine_power_rpm',
                'model_engine_stroke_mm',
                'model_engine_torque_nm',
                'model_engine_torque_rpm',
                'model_engine_valves_per_cyl',
                'model_fuel_cap_l',
                'model_length_mm',
                'model_lkm_city',
                'model_lkm_hwy',
                'model_lkm_mixed',
                'model_make_display',
                'model_seats',
                'model_sold_in_us',
                'model_top_speed_kph',
                'model_transmission_type',
                'model_weight_kg',
                'model_wheelbase_mm',
                'model_width_mm',
            ]);
        });
    }

    public function down()
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn('location');
            $table->dropColumn('model');
            $table->dropColumn('model_data');
            $table->dropColumn('telematics');

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
        });
    }
};
