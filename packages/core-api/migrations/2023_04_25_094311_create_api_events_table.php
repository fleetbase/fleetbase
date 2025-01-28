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
        Schema::create('api_events', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('api_credential_uuid')->nullable();
            $table->string('event', 191)->nullable();
            $table->string('source')->nullable();
            $table->json('data')->nullable();
            $table->string('description')->nullable();
            $table->string('method', 191)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['public_id', 'event', 'method']);
            $table->unique(['uuid']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('api_events');
    }
};
