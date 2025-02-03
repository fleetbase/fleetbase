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
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('internal_id')->nullable();
            $table->uuid('company_uuid');
            $table->char('user_uuid', 36)->nullable()->index();
            $table->char('driver_uuid', 36)->nullable()->index();
            // $table->enum('leave_type', ['Sick', 'Casual', 'Annual', 'Unpaid']);
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('total_days')->storedAs('DATEDIFF(end_date, start_date) + 1'); // Auto-calculate total days
            $table->text('reason')->nullable();
            $table->enum('status', ['Submitted', 'Pending', 'Approved', 'Rejected', 'Cancelled'])->default('Submitted');
            $table->uuid('approved_by')->nullable(); // Admin who approved the leave
            $table->json('meta')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['uuid']);
            // Indexes for faster queries
            $table->index('company_uuid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
