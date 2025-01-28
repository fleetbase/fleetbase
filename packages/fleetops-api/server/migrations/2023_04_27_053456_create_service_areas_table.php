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
        Schema::create('service_areas', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->uuid('company_uuid')->nullable()->index('service_areas_company_uuid_foreign');
            $table->string('name')->nullable();
            $table->string('type')->nullable();
            $table->string('country')->nullable();
            $table->multiPolygon('border')->nullable();
            $table->string('color')->nullable();
            $table->string('stroke_color')->nullable();
            $table->uuid('parent_uuid')->nullable()->index('service_areas_parent_uuid_foreign');
            $table->string('status')->nullable();
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
        Schema::dropIfExists('service_areas');
    }
};
