<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_statuses', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->unique();
            $table->uuid('company_uuid')->nullable();

            $table->string('name'); // e.g., 'Pending', 'Completed'
            $table->string('code')->unique(); // e.g., 'PENDING', 'COMPLETED'
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);

            // Auditing & status fields
            $table->tinyInteger('record_status')->default(1);
            $table->tinyInteger('deleted')->default(0);
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->unsignedBigInteger('updated_by_id')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->nullable()->useCurrentOnUpdate();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_statuses');
    }
};
