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
        Schema::table('extensions', function (Blueprint $table) {
            $table->foreign(['author_uuid'])->references(['uuid'])->on('companies')->onUpdate('NO ACTION')->onDelete('CASCADE');
            $table->foreign(['category_uuid'])->references(['uuid'])->on('categories')->onUpdate('NO ACTION')->onDelete('CASCADE');
            $table->foreign(['icon_uuid'])->references(['uuid'])->on('files')->onUpdate('NO ACTION')->onDelete('CASCADE');
            $table->foreign(['type_uuid'])->references(['uuid'])->on('types')->onUpdate('NO ACTION')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('extensions', function (Blueprint $table) {
            $table->dropForeign('extensions_author_uuid_foreign');
            $table->dropForeign('extensions_category_uuid_foreign');
            $table->dropForeign('extensions_icon_uuid_foreign');
            $table->dropForeign('extensions_type_uuid_foreign');
        });
    }
};
