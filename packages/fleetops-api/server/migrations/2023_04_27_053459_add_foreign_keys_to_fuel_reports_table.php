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
        Schema::table('fuel_reports', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['driver_uuid'])->references(['uuid'])->on('drivers')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['vehicle_uuid'])->references(['uuid'])->on('vehicles')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('fuel_reports', function (Blueprint $table) {
            $table->dropForeign('fuel_reports_company_uuid_foreign');
            $table->dropForeign('fuel_reports_driver_uuid_foreign');
            $table->dropForeign('fuel_reports_vehicle_uuid_foreign');
        });
    }
};
