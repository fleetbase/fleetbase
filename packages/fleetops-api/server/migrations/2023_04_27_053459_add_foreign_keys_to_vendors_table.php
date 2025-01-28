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
        Schema::table('vendors', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['connect_company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['logo_uuid'])->references(['uuid'])->on('files')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['place_uuid'])->references(['uuid'])->on('places')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['type_uuid'])->references(['uuid'])->on('types')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropForeign('vendors_company_uuid_foreign');
            $table->dropForeign('vendors_connect_company_uuid_foreign');
            $table->dropForeign('vendors_logo_uuid_foreign');
            $table->dropForeign('vendors_place_uuid_foreign');
            $table->dropForeign('vendors_type_uuid_foreign');
        });
    }
};
