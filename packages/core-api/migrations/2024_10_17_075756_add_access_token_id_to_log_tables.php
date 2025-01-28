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
        Schema::disableForeignKeyConstraints();

        Schema::table('api_events', function (Blueprint $table) {
            $table->foreignId('access_token_id')->nullable()->after('api_credential_uuid')->references(['id'])->on('personal_access_tokens')->onUpdate('CASCADE')->onDelete('CASCADE');
        });

        Schema::table('webhook_request_logs', function (Blueprint $table) {
            $table->foreignId('access_token_id')->nullable()->after('api_credential_uuid')->references(['id'])->on('personal_access_tokens')->onUpdate('CASCADE')->onDelete('CASCADE');
        });

        Schema::table('api_request_logs', function (Blueprint $table) {
            $table->foreignId('access_token_id')->nullable()->after('api_credential_uuid')->references(['id'])->on('personal_access_tokens')->onUpdate('CASCADE')->onDelete('CASCADE');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('api_events', function (Blueprint $table) {
            $table->dropForeign(['access_token_id']);
            $table->dropColumn('access_token_id');
        });

        Schema::table('webhook_request_logs', function (Blueprint $table) {
            $table->dropForeign(['access_token_id']);
            $table->dropColumn('access_token_id');
        });

        Schema::table('api_request_logs', function (Blueprint $table) {
            $table->dropForeign(['access_token_id']);
            $table->dropColumn('access_token_id');
        });

        Schema::enableForeignKeyConstraints();
    }
};
