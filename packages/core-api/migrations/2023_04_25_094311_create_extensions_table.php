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
        Schema::create('extensions', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->index();
            $table->string('extension_id', 191)->nullable()->index();
            $table->string('author_uuid', 191)->nullable()->index();
            $table->string('category_uuid', 191)->nullable()->index();
            $table->string('type_uuid', 191)->nullable()->index();
            $table->string('name')->nullable();
            $table->string('display_name')->nullable();
            $table->string('key')->nullable();
            $table->mediumText('description')->nullable();
            $table->json('tags')->nullable();
            $table->string('namespace')->nullable();
            $table->string('version')->nullable();
            $table->string('component_url')->nullable();
            $table->string('website_url')->nullable();
            $table->string('privacy_policy_url')->nullable();
            $table->string('tos_url')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('icon_uuid', 191)->nullable()->index();
            $table->json('domains')->nullable();
            $table->boolean('core_service')->default(false)->index();
            $table->string('internal_route')->nullable();
            $table->string('fa_icon')->nullable();
            $table->json('meta')->nullable();
            $table->string('meta_type')->nullable();
            $table->json('config')->nullable();
            $table->string('secret')->nullable();
            $table->string('client_token')->nullable();
            $table->string('status')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->string('slug')->nullable();

            $table->unique(['extension_id']);
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
        Schema::dropIfExists('extensions');
    }
};
