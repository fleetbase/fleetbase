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
        Schema::create('route_segments', function (Blueprint $table) {
            $table->engine = 'InnoDB'; // Use InnoDB for foreign key support
            $table->increments('id'); // Auto-incrementing primary key
            $table->string('uuid', 191)->nullable()->index();
            $table->unsignedInteger('order_id')->index();
            $table->string('payload_id')->index();
            $table->string('from_waypoint_id')->index();
            $table->string('to_waypoint_id')->index();
            $table->string('public_id')->unique(); // VR ID like VR001
            $table->tinyInteger('record_status')->default(1);
            $table->tinyInteger('deleted')->default(value: 0);
            $table->integer('created_by_id');
            $table->integer('updated_by_id')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the foreign key constraints first
        Schema::table('route_segments', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
        });
        Schema::dropIfExists('route_segments');
    }
};
