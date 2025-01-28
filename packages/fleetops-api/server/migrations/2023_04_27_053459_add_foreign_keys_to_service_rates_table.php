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
        Schema::table('service_rates', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['service_area_uuid'])->references(['uuid'])->on('service_areas')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['zone_uuid'])->references(['uuid'])->on('zones')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('service_rates', function (Blueprint $table) {
            $table->dropForeign('service_rates_company_uuid_foreign');
            $table->dropForeign('service_rates_service_area_uuid_foreign');
            $table->dropForeign('service_rates_zone_uuid_foreign');
        });
    }
};
