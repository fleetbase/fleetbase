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
        Schema::create('drivers', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('internal_id')->nullable();
            $table->uuid('company_uuid')->nullable()->index('drivers_company_uuid_foreign');
            $table->uuid('vehicle_uuid')->nullable()->index('drivers_vehicle_uuid_foreign');
            $table->uuid('vendor_uuid')->nullable()->index('drivers_vendor_uuid_foreign');
            $table->string('vendor_type')->nullable();
            $table->uuid('current_job_uuid')->nullable()->index('drivers_current_job_uuid_foreign');
            $table->uuid('user_uuid')->nullable()->index();
            $table->string('auth_token')->nullable();
            $table->string('drivers_license_number')->nullable();
            $table->string('signup_token_used')->nullable();
            $table->point('location');
            $table->string('latitude')->nullable();
            $table->string('longitude')->nullable();
            $table->string('heading')->nullable();
            $table->string('bearing')->nullable();
            $table->string('speed')->nullable();
            $table->string('altitude')->nullable();
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('currency')->nullable();
            $table->integer('online')->default(0)->index();
            $table->string('status', 191)->nullable()->index();
            $table->string('slug', 191)->nullable()->index();
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
        Schema::dropIfExists('drivers');
    }
};
