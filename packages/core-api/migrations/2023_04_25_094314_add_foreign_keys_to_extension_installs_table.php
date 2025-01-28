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
        Schema::table('extension_installs', function (Blueprint $table) {
            $table->foreign('company_uuid')
                ->references('uuid')
                ->on('companies')
                ->onDelete('cascade');

            $table->foreign('extension_uuid')
                ->references('uuid')
                ->on('extensions')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('extension_installs', function (Blueprint $table) {
            $table->dropForeign(['company_uuid']);
            $table->dropForeign(['extension_uuid']);
        });
    }
};
