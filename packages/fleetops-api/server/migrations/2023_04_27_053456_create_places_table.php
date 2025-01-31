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
        Schema::create('places', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('_import_id', 191)->nullable()->index();
            $table->uuid('company_uuid')->nullable()->index();
            $table->char('owner_uuid', 36)->nullable()->index();
            $table->string('owner_type')->nullable();
            $table->string('name')->nullable();
            $table->string('street1')->nullable();
            $table->string('street2')->nullable();
            $table->string('city', 191)->nullable()->index();
            $table->string('province')->nullable();
            $table->string('postal_code', 191)->nullable()->index();
            $table->string('neighborhood', 191)->nullable()->index();
            $table->string('district', 191)->nullable()->index();
            $table->string('building', 191)->nullable()->index();
            $table->string('security_access_code')->nullable();
            $table->string('country', 191)->nullable()->index();
            $table->point('location');
            $table->string('latitude')->nullable();
            $table->string('longitude')->nullable();
            $table->json('meta')->nullable();
            $table->string('phone')->nullable();
            $table->mediumText('remarks')->nullable();
            $table->string('type', 191)->nullable()->index();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->index(['uuid']);
            $table->index(['public_id']);
            $table->spatialIndex(['location'], 'location');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('places');
    }
};
