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
        Schema::create('amazon_warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->unique()->nullable();
            $table->string('public_id', 191)->unique()->nullable();
            $table->string('code')->nullable();
            $table->string('_import_id', 191)->nullable()->index();
            $table->char('company_uuid', 36)->nullable()->index();
            $table->char('owner_uuid', 36)->nullable()->index();
            $table->string('owner_type')->nullable();
            $table->string('name')->nullable();
            $table->string('street1')->nullable()->index();
            $table->string('street2')->nullable()->index();
            $table->string('city', 191)->nullable()->index();
            $table->string('province')->nullable();
            $table->string('postal_code', 191)->nullable()->index();
            $table->string('neighborhood', 191)->nullable()->index();
            $table->string('district', 191)->nullable()->index();
            $table->string('building', 191)->nullable()->index();
            $table->string('security_access_code')->nullable();
            $table->string('country', 191)->nullable()->index();
            $table->point('location');
            $table->string('latitude')->nullable();
            $table->string('longitude')->nullable();
            $table->json('meta')->nullable();
            $table->string('phone')->nullable();
            $table->mediumText('remarks')->nullable();
            $table->mediumText('avatar_url')->nullable();
            $table->string('type', 191)->nullable()->index();
            $table->boolean('is_non_amazon_warehouse')->default(false)->index();
            $table->softDeletes();
            $table->timestamps();

            // Indexes
            $table->index('created_at');
            $table->index('code');
            $table->index('name');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('amazon_warehouses');
    }
};
