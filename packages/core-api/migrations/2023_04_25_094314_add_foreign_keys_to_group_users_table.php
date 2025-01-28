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
        Schema::table('group_users', function (Blueprint $table) {
            $table->foreign(['group_uuid'])->references(['uuid'])->on('groups')->onUpdate('NO ACTION')->onDelete('CASCADE');
            $table->foreign(['user_uuid'])->references(['uuid'])->on('users')->onUpdate('NO ACTION')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('group_users', function (Blueprint $table) {
            $table->dropForeign('group_users_group_uuid_foreign');
            $table->dropForeign('group_users_user_uuid_foreign');
        });
    }
};
