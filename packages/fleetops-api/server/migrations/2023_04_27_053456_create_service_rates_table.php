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
        Schema::create('service_rates', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('service_area_uuid')->nullable()->index();
            $table->uuid('zone_uuid')->nullable()->index();
            $table->string('service_name')->nullable();
            $table->string('service_type', 191)->nullable()->index();
            $table->integer('base_fee')->default(0)->nullable();
            $table->integer('per_meter_flat_rate_fee')->default(0)->nullable();
            $table->string('per_meter_unit')->nullable();
            $table->string('algorithm')->nullable();
            $table->string('rate_calculation_method')->nullable();
            $table->integer('has_cod_fee')->default(0)->nullable();
            $table->string('cod_calculation_method')->nullable();
            $table->integer('cod_flat_fee')->default(0)->nullable();
            $table->integer('cod_percent')->default(0)->nullable();
            $table->integer('has_peak_hours_fee')->default(0)->nullable();
            $table->string('peak_hours_calculation_method')->nullable();
            $table->integer('peak_hours_flat_fee')->default(0)->nullable();
            $table->integer('peak_hours_percent')->default(0)->nullable();
            $table->string('peak_hours_start')->nullable();
            $table->string('peak_hours_end')->nullable();
            $table->string('currency')->nullable();
            $table->string('duration_terms')->nullable();
            $table->integer('estimated_days')->default(0)->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

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
        Schema::dropIfExists('service_rates');
    }
};
