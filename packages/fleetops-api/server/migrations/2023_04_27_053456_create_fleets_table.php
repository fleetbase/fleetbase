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
        Schema::create('fleets', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('service_area_uuid')->nullable()->index('fleets_service_area_uuid_foreign');
            $table->uuid('zone_uuid')->nullable()->index('fleets_zone_uuid_foreign');
            $table->string('image_uuid')->nullable();
            $table->string('name')->nullable();
            $table->string('color')->nullable();
            $table->string('task')->nullable();
            $table->string('status', 191)->nullable()->index();
            $table->string('slug', 191)->nullable()->index();
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
        Schema::dropIfExists('fleets');
    }
};
