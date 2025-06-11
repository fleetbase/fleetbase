<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
        $table->integer('language_id')->index();
        $table->integer('number_of_drivers');
        $table->integer('number_of_web_users');
        
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['language_id', 'number_of_drivers', 'number_of_web_users']);
        });
    }
};
