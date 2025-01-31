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
        Schema::table('proofs', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['file_uuid'])->references(['uuid'])->on('files')->onUpdate('NO ACTION')->onDelete('NO ACTION');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('proofs', function (Blueprint $table) {
            $table->dropForeign('proofs_company_uuid_foreign');
            $table->dropForeign('proofs_file_uuid_foreign');
        });
    }
};
