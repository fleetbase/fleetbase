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
        Schema::table('waypoints', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['payload_uuid'])->references(['uuid'])->on('payloads')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['place_uuid'])->references(['uuid'])->on('places')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['tracking_number_uuid'])->references(['uuid'])->on('tracking_numbers')->onUpdate('NO ACTION')->onDelete('NO ACTION');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('waypoints', function (Blueprint $table) {
            $table->dropForeign('waypoints_company_uuid_foreign');
            $table->dropForeign('waypoints_payload_uuid_foreign');
            $table->dropForeign('waypoints_place_uuid_foreign');
            $table->dropForeign('waypoints_tracking_number_uuid_foreign');
        });
    }
};
