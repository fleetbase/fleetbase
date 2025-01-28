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
        Schema::create('issues', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('issue_id', 191)->nullable()->unique();
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('driver_uuid')->nullable()->index('issues_driver_uuid_foreign');
            $table->uuid('vehicle_uuid')->nullable()->index('issues_vehicle_uuid_foreign');
            $table->uuid('assigned_to_uuid')->nullable()->index('issues_assigned_to_uuid_foreign');
            $table->string('odometer')->nullable();
            $table->point('location');
            $table->string('latitude')->nullable();
            $table->string('longitude')->nullable();
            $table->string('type')->nullable();
            $table->string('report')->nullable();
            $table->string('priority')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->string('status')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['uuid']);
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
        Schema::dropIfExists('issues');
    }
};
