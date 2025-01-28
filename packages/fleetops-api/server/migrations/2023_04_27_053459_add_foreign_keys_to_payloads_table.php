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
        Schema::table('payloads', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['current_waypoint_uuid'])->references(['uuid'])->on('places')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['dropoff_uuid'])->references(['uuid'])->on('places')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['pickup_uuid'])->references(['uuid'])->on('places')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['return_uuid'])->references(['uuid'])->on('places')->onUpdate('NO ACTION')->onDelete('NO ACTION');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('payloads', function (Blueprint $table) {
            $table->dropForeign('payloads_company_uuid_foreign');
            $table->dropForeign('payloads_current_waypoint_uuid_foreign');
            $table->dropForeign('payloads_dropoff_uuid_foreign');
            $table->dropForeign('payloads_pickup_uuid_foreign');
            $table->dropForeign('payloads_return_uuid_foreign');
        });
    }
};
