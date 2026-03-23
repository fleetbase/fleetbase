<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rider_capacities', function (Blueprint $table) {
            $table->id();
            $table->string('rider_id')->unique()->index();
            $table->unsignedTinyInteger('active_count')->default(0);
            $table->json('order_ids')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rider_capacities');
    }
};
