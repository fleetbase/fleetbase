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
        Schema::create('comments', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable()->index();
            $table->string('public_id')->nullable()->unique();
            $table->foreignUuid('company_uuid')->references('uuid')->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreignUuid('author_uuid')->references('uuid')->on('users')->onUpdate('CASCADE')->onDelete('CASCADE');
            // $table->foreignUuid('parent_comment_uuid')->nullable()->references('uuid')->on('comments')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->uuid('subject_uuid');
            $table->string('subject_type')->nullable();
            $table->mediumText('content');
            $table->json('tags')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->foreignUuid('parent_comment_uuid')->nullable()->after('author_uuid')->references('uuid')->on('comments')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('comments');
    }
};
