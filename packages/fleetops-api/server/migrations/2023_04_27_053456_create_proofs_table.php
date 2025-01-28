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
        Schema::create('proofs', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->char('uuid', 36)->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->char('order_uuid', 36)->nullable();
            $table->char('subject_uuid', 36)->nullable()->index();
            $table->string('subject_type')->nullable();
            $table->char('company_uuid', 36)->nullable()->index();
            $table->char('file_uuid', 36)->nullable()->index();
            $table->longText('remarks')->nullable();
            $table->longText('raw_data')->nullable();
            $table->json('data')->nullable();
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
        Schema::dropIfExists('proofs');
    }
};
