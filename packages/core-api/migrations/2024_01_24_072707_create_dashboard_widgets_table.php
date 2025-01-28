<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDashboardWidgetsTable extends Migration
{
    public function up()
    {
        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->nullable()->index();
            $table->uuid('dashboard_uuid')->nullable()->index();
            $table->string('name');
            $table->string('component');
            $table->json('grid_options');
            $table->json('options');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('dashboard_widgets');
    }
}
