<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Increase size of vehicles avatar url column for signed urls
        Schema::table('vehicles', function (Blueprint $table) {
            $table->mediumText('avatar_url')->change();
        });

        // Add avatar url column to places
        Schema::table('places', function (Blueprint $table) {
            $table->mediumText('avatar_url')->nullable()->after('remarks');
        });

        // Add avatar url column to drivers
        Schema::table('drivers', function (Blueprint $table) {
            $table->mediumText('avatar_url')->nullable()->after('signup_token_used');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // @todo this can break migrations if avatar url is over 300 characters to we need to remove this and keep mediumtext
        // Reverse: Increase size of vehicles avatar url column for signed urls
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('avatar_url', 300)->change();
        });

        // Reverse: Add avatar url column to places
        Schema::table('places', function (Blueprint $table) {
            $table->dropColumn('avatar_url');
        });

        // Reverse: Add avatar url column to drivers
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn('avatar_url');
        });
    }
};
