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
        Schema::create('chat_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->nullable()->index();
            $table->string('public_id')->nullable()->index();
            $table->foreignUuid('company_uuid')->nullable()->index()->references('uuid')->on('companies');
            $table->foreignUuid('chat_channel_uuid')->nullable()->index()->references('uuid')->on('chat_channels');
            $table->foreignUuid('initiator_uuid')->nullable()->index()->references('uuid')->on('chat_participants');
            $table->string('event_type');
            $table->mediumText('content');
            $table->json('subjects');
            $table->json('meta')->nullable();
            $table->string('status')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_logs');
    }
};
