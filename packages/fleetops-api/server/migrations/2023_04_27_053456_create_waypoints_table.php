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
        Schema::create('waypoints', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id')->nullable();
            $table->uuid('company_uuid')->nullable()->index('waypoints_company_uuid_foreign');
            $table->uuid('place_uuid')->nullable()->index('waypoints_place_uuid_foreign');
            $table->uuid('payload_uuid')->nullable()->index('waypoints_payload_uuid_foreign');
            $table->uuid('tracking_number_uuid')->nullable()->index();
            $table->string('_import_id', 191)->nullable()->index();
            $table->string('type')->nullable();
            $table->integer('order')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

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
        Schema::dropIfExists('waypoints');
    }
};
