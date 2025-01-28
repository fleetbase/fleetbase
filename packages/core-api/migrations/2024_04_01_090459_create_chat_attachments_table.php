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
        Schema::create('chat_attachments', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable()->index();
            $table->string('public_id')->nullables()->index();
            $table->foreignUuid('company_uuid')->nullable()->index()->references('uuid')->on('companies');
            $table->foreignUuid('sender_uuid')->nullable()->index()->references('uuid')->on('chat_participants');
            $table->foreignUuid('chat_channel_uuid')->nullable()->index()->references('uuid')->on('chat_channels');
            $table->foreignUuid('chat_message_uuid')->nullable()->index()->references('uuid')->on('chat_messages');
            $table->foreignUuid('file_uuid')->nullable()->index()->references('uuid')->on('files');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_attachments');
    }
};
