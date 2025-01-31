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
        Schema::create('extension_installs', function (Blueprint $table) {
            $table->id();
            $table->string('_key', 255)->nullable();
            $table->string('uuid', 191)->unique()->nullable();
            $table->char('extension_uuid', 36)->nullable()->index();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->json('config')->nullable();
            $table->json('meta')->nullable();
            $table->json('overwrite')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('extension_installs');
    }
};
