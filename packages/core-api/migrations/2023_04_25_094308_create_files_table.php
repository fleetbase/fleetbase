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
        Schema::create('files', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id')->nullable()->default('')->index();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('uploader_uuid', 191)->nullable()->index();
            $table->string('subject_uuid')->nullable();
            $table->string('caption')->nullable();
            $table->longText('path')->nullable();
            $table->string('subject_type')->nullable();
            $table->string('bucket')->nullable();
            $table->string('folder')->nullable();
            $table->string('etag')->nullable();
            $table->mediumText('data_params')->nullable();
            $table->string('original_filename')->nullable();
            $table->string('type')->nullable();
            $table->string('content_type')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('slug')->nullable();
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
        Schema::withoutForeignKeyConstraints(function () {
            Schema::dropIfExists('files');
        });
    }
};
