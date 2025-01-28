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
        Schema::table('entities', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['destination_uuid'])->references(['uuid'])->on('places')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['driver_assigned_uuid'])->references(['uuid'])->on('drivers')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['payload_uuid'])->references(['uuid'])->on('payloads')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['tracking_number_uuid'])->references(['uuid'])->on('tracking_numbers')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('entities', function (Blueprint $table) {
            $table->dropForeign('entities_company_uuid_foreign');
            $table->dropForeign('entities_destination_uuid_foreign');
            $table->dropForeign('entities_driver_assigned_uuid_foreign');
            $table->dropForeign('entities_payload_uuid_foreign');
            $table->dropForeign('entities_tracking_number_uuid_foreign');
        });
    }
};
