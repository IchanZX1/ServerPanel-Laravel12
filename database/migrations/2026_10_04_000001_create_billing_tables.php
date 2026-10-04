<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateBillingTables extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel Pterodactyl lama (users, servers, eggs, nodes) memakai
     * increments('id') = INT UNSIGNED, jadi FK billing harus unsignedInteger()
     * agar tipe cocok (bigInt -> errno 150 di MySQL).
     */
    public function up(): void
    {
        Schema::create('billing_plans', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('egg_id');
            // A null node_id means the server is auto-deployed to any viable node.
            $table->unsignedInteger('node_id')->nullable();
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

            $table->foreign('egg_id')->references('id')->on('eggs')->cascadeOnDelete();
            $table->foreign('node_id')->references('id')->on('nodes')->nullOnDelete();
        });

        Schema::create('billing_subscriptions', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('plan_id')->nullable();
            $table->unsignedInteger('server_id')->nullable();
            $table->string('status', 20)->default('pending_payment')->index();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('plan_id')->references('id')->on('billing_plans')->nullOnDelete();
            $table->foreign('server_id')->references('id')->on('servers')->nullOnDelete();
        });

        Schema::create('billing_invoices', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('subscription_id');
            $table->unsignedInteger('user_id');
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

            $table->foreign('subscription_id')->references('id')->on('billing_subscriptions')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
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
