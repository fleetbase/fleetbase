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
            $table->unsignedInteger('payload_id')->index();
            $table->unsignedInteger('from_waypoint_id')->index();
            $table->unsignedInteger('to_waypoint_id')->index();
            $table->string('route_id')->unique(); // VR ID like VR001

            $table->tinyInteger('record_status')->default(1);
            $table->tinyInteger('deleted')->default(0);
            $table->integer('created_by_id')->nullable();
            $table->integer('updated_by_id')->nullable();

            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            // Foreign key constraints
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('payload_id')->references('id')->on('payloads')->onDelete('cascade');
            $table->foreign('from_waypoint_id')->references('id')->on('waypoints')->onDelete('cascade');
            $table->foreign('to_waypoint_id')->references('id')->on('waypoints')->onDelete('cascade');
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
            $table->dropForeign(['payload_id']);
            $table->dropForeign(['from_waypoint_id']);
            $table->dropForeign(['to_waypoint_id']);
        });
        Schema::dropIfExists('route_segments');
    }
};
