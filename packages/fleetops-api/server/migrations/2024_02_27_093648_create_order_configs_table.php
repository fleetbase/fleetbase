<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_configs', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable()->index();
            $table->foreignUuid('company_uuid')->nullable()->references('uuid')->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreignUuid('author_uuid')->nullable()->references('uuid')->on('users')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreignUuid('category_uuid')->nullable()->references('uuid')->on('categories')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreignUuid('icon_uuid')->nullable()->references('uuid')->on('files')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->string('name')->nullable();
            $table->string('namespace')->nullable();
            $table->mediumText('description')->nullable();
            $table->string('key')->nullable();
            $table->string('status')->nullable();
            $table->string('version')->nullable();
            $table->boolean('core_service')->default(0);
            $table->json('flow')->nullable();
            $table->json('entities')->nullable();
            $table->json('tags')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_configs');
    }
};
