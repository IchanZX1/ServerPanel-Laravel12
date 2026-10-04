<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateBillingTables extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('billing_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('egg_id')->constrained('eggs')->cascadeOnDelete();
            // A null node_id means the server is auto-deployed to any viable node.
            $table->foreignId('node_id')->nullable()->constrained('nodes')->nullOnDelete();
            $table->integer('memory')->unsigned();
            $table->integer('swap')->unsigned()->default(0);
            $table->integer('disk')->unsigned();
            $table->integer('io')->unsigned()->default(500);
            $table->integer('cpu')->unsigned();
            $table->string('threads')->nullable();
            $table->integer('database_limit')->unsigned()->default(0);
            $table->integer('allocation_limit')->unsigned()->default(0);
            $table->integer('backup_limit')->unsigned()->default(0);
            $table->string('docker_image');
            $table->text('startup');
            $table->json('environment')->nullable();
            // Price stored in IDR without decimals (e.g. 10000 = Rp 10.000).
            $table->integer('price_cents')->unsigned();
            $table->integer('duration_days')->unsigned();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('billing_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('billing_plans')->nullOnDelete();
            $table->foreignId('server_id')->nullable()->constrained('servers')->nullOnDelete();
            $table->string('status', 20)->default('pending_payment')->index();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->timestamps();
        });

        Schema::create('billing_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('billing_subscriptions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('order_id')->unique();
            $table->string('inv_id')->nullable();
            $table->integer('amount_cents')->unsigned();
            $table->text('redirect_url');
            $table->text('qr_string')->nullable();
            $table->timestamp('gateway_expires_at')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->timestamp('paid_at')->nullable();
            $table->string('type', 12)->default('initial');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('billing_invoices');
        Schema::dropIfExists('billing_subscriptions');
        Schema::dropIfExists('billing_plans');
    }
}
