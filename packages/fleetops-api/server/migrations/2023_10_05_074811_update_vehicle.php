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
            if (!Schema::hasColumn('vehicles', 'speed')) {
                $table->string('speed')->nullable()->after('location');
            }
            if (!Schema::hasColumn('vehicles', 'heading')) {
                $table->string('heading')->nullable()->after('speed');
            }
            if (!Schema::hasColumn('vehicles', 'altitude')) {
                $table->string('altitude')->nullable()->after('heading');
            }
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
            $table->dropColumn('speed');
            $table->dropColumn('heading');
            $table->dropColumn('altitude');
        });
    }
};
