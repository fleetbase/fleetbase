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
        Schema::table('drivers', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['current_job_uuid'])->references(['uuid'])->on('orders')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['user_uuid'])->references(['uuid'])->on('users')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['vehicle_uuid'])->references(['uuid'])->on('vehicles')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['vendor_uuid'])->references(['uuid'])->on('vendors')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropForeign('drivers_company_uuid_foreign');
            $table->dropForeign('drivers_current_job_uuid_foreign');
            $table->dropForeign('drivers_user_uuid_foreign');
            $table->dropForeign('drivers_vehicle_uuid_foreign');
            $table->dropForeign('drivers_vendor_uuid_foreign');
        });
    }
};
