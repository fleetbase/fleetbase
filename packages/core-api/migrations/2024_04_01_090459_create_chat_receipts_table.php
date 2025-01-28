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
        Schema::create('chat_receipts', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable()->index();
            $table->string('public_id')->nullable()->index();
            $table->foreignUuid('company_uuid')->nullable()->index()->references('uuid')->on('companies');
            $table->foreignUuid('participant_uuid')->nullable()->index()->references('uuid')->on('chat_participants');
            $table->foreignUuid('chat_message_uuid')->nullable()->index()->references('uuid')->on('chat_messages');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_receipts');
    }
};
