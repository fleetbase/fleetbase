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
            $table->dropColumn(['longitude', 'latitude']);
            $table->json('meta')->nullable()->after('metric_unit');
            $table->mediumText('report')->nullable()->after('vehicle_uuid');
            $table->foreignUuid('reported_by_uuid')->nullable()->after('vehicle_uuid')->references('uuid')->on('users')->onDelete('cascade');
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
            $table->string('longitude')->nullable()->after('location');
            $table->string('latitude')->nullable()->after('location');
            $table->dropForeign(['reported_by_uuid']);
            $table->dropColumn(['reported_by_uuid', 'meta', 'report']);
        });
    }
};
