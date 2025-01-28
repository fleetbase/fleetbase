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
        Schema::table('companies', function (Blueprint $table) {
            $table->foreign(['backdrop_uuid'])->references(['uuid'])->on('files')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['logo_uuid'])->references(['uuid'])->on('files')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['owner_uuid'])->references(['uuid'])->on('users')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropForeign('companies_backdrop_uuid_foreign');
            $table->dropForeign('companies_logo_uuid_foreign');
            $table->dropForeign('companies_owner_uuid_foreign');
        });
    }
};
