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
        Schema::create('tracking_statuses', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->index();
            $table->uuid('company_uuid')->nullable()->index('tracking_statuses_company_uuid_foreign');
            $table->uuid('tracking_number_uuid')->nullable()->index('tracking_statuses_tracking_number_uuid_foreign');
            $table->char('proof_uuid', 36)->nullable();
            $table->json('meta')->nullable();
            $table->string('status', 191)->nullable()->index();
            $table->mediumText('details')->nullable();
            $table->string('code')->nullable();
            $table->string('city')->nullable();
            $table->string('province')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('country')->nullable();
            $table->point('location');
            $table->string('latitude')->nullable();
            $table->string('longitude')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->spatialIndex(['location'], 'location');
            $table->unique(['public_id']);
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
        Schema::dropIfExists('tracking_statuses');
    }
};
