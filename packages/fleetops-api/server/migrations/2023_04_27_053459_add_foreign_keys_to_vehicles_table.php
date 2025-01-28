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
        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['photo_uuid'])->references(['uuid'])->on('files')->onUpdate('CASCADE')->onDelete('CASCADE');
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
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropForeign('vehicles_company_uuid_foreign');
            $table->dropForeign('vehicles_photo_uuid_foreign');
            $table->dropForeign('vehicles_vendor_uuid_foreign');
        });
    }
};
