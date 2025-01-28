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
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn(['longitude', 'latitude', 'odometer']);
            $table->string('category')->nullable()->after('type');
            $table->json('tags')->nullable()->after('priority');
            $table->json('meta')->nullable()->after('priority');
            $table->mediumText('report')->change();
            $table->foreignUuid('reported_by_uuid')->nullable()->after('assigned_to_uuid')->references('uuid')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->string('longitude')->nullable()->after('location');
            $table->string('latitude')->nullable()->after('location');
            $table->string('odometer')->nullable()->after('location');
            $table->string('report')->change();
            $table->dropForeign(['reported_by_uuid']);
            $table->dropColumn(['reported_by_uuid', 'meta', 'tags', 'category']);
        });
    }
};
