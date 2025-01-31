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
        Schema::create(config('activitylog.table_name'), function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable();
            $table->string('log_name')->nullable()->index();
            $table->text('description');
            $table->uuid('company_id')->nullable()->index();
            $table->uuid('subject_id')->nullable()->index();
            $table->string('subject_type')->nullable();
            $table->uuid('causer_id')->nullable()->index();
            $table->string('causer_type')->nullable();
            $table->text('properties')->nullable();
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
        Schema::dropIfExists(config('activitylog.table_name'));
    }
};
