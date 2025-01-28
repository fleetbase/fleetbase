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
        Schema::create('verification_codes', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->char('uuid', 36)->unique();
            $table->char('subject_uuid', 36)->nullable()->index();
            $table->string('subject_type')->nullable();
            $table->string('code')->nullable();
            $table->string('for', 191)->nullable()->index();
            $table->json('meta')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->string('status', 191)->nullable()->index();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('verification_codes');
    }
};
