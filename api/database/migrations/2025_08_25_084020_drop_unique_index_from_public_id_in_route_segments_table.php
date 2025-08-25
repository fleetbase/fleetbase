<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('route_segments', function (Blueprint $table) {
           $table->dropUnique('route_segments_public_id_unique');
        });
    }

    public function down()
    {
        Schema::table('route_segments', function (Blueprint $table) {
            $table->unique('public_id'); // Add back unique constraint on rollback
        });
    }
};
