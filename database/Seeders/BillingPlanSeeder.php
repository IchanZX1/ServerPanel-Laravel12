<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Billing\BillingPlan;

/**
 * Katalog paket Store (PRD: "Katalog paket (Hemat, Pro, Extreme)").
 *
 * ============================ HARGA PLACEHOLDER ============================
 * PRD tidak menyebut satu pun angka harga. Nilai `price_cents` dan
 * `duration_days` di bawah adalah PLACEHOLDER supaya /store tidak kosong saat
 * development. Ganti lewat /admin/billing/plans sebelum dipakai produksi —
 * seeder ini memakai updateOrCreate pada `name`, jadi menjalankannya ulang
 * akan menimpa harga yang sudah diubah admin.
 * ==========================================================================
 *
 * Egg dan docker image TIDAK di-hardcode sebagai id/string bebas:
 * - egg_id di-resolve dari nama egg "Paper" di nest "Minecraft" (hasil
 *   NestSeeder + EggSeeder). Kalau egg tidak ada, plan dilewati dengan
 *   peringatan alih-alih gagal dengan FK error.
 * - docker_image diambil dari daftar docker_images egg tersebut, supaya
 *   nilainya dijamin ada di egg dan lolos validasi ServerCreationService.
 *
 * `node_id` sengaja dibiarkan null = auto-deploy ke node viable manapun
 * (perilaku yang sudah didukung SubscriptionProvisionService).
 */
class BillingPlanSeeder extends Seeder
{
    /**
     * Spesifikasi bertingkat Hemat -> Pro -> Extreme.
     *
     * memory/disk dalam MB, cpu dalam persen (100 = 1 core), io 500 = default
     * Pterodactyl, threads null = tanpa pinning.
     */
    public const PLANS = [
        [
            'name' => 'Hemat',
            'description' => 'Cocok untuk server kecil atau bot ringan. RAM 1 GB, disk 5 GB.',
            'memory' => 1024,
            'disk' => 5120,
            'cpu' => 100,
            'database_limit' => 1,
            'allocation_limit' => 1,
            'backup_limit' => 1,
            // PLACEHOLDER — Rp 10.000 / 30 hari.
            'price_cents' => 10000,
            'duration_days' => 30,
        ],
        [
            'name' => 'Pro',
            'description' => 'Untuk server komunitas dengan plugin dan pemain aktif. RAM 4 GB, disk 20 GB.',
            'memory' => 4096,
            'disk' => 20480,
            'cpu' => 200,
            'database_limit' => 3,
            'allocation_limit' => 2,
            'backup_limit' => 3,
            // PLACEHOLDER — Rp 35.000 / 30 hari.
            'price_cents' => 35000,
            'duration_days' => 30,
        ],
        [
            'name' => 'Extreme',
            'description' => 'Untuk modpack berat dan pemain ramai. RAM 8 GB, disk 50 GB.',
            'memory' => 8192,
            'disk' => 51200,
            'cpu' => 300,
            'database_limit' => 5,
            'allocation_limit' => 3,
            'backup_limit' => 5,
            // PLACEHOLDER — Rp 75.000 / 30 hari.
            'price_cents' => 75000,
            'duration_days' => 30,
        ],
    ];

    public function run()
    {
        $egg = Egg::query()
            ->where('name', 'Paper')
            ->whereHas('nest', function ($query) {
                $query->where('name', 'Minecraft');
            })
            ->first();

        if (is_null($egg)) {
            $this->command->warn(
                'Egg "Paper" di nest "Minecraft" tidak ditemukan — BillingPlanSeeder dilewati. '
                . 'Jalankan NestSeeder lalu EggSeeder terlebih dahulu.'
            );

            return;
        }

        // Egg menyimpan map label => image. Ambil nilai pertama sebagai default
        // plan; admin tetap bisa menggantinya per-plan lewat /admin/billing/plans.
        $dockerImages = array_values($egg->docker_images ?? []);
        $dockerImage = $dockerImages[0] ?? null;

        if (is_null($dockerImage)) {
            $this->command->warn("Egg \"Paper\" tidak punya docker_images — BillingPlanSeeder dilewati.");

            return;
        }

        foreach (static::PLANS as $plan) {
            BillingPlan::query()->updateOrCreate(
                ['name' => $plan['name']],
                array_merge($plan, [
                    'egg_id' => $egg->id,
                    'node_id' => null,
                    'swap' => 0,
                    'io' => 500,
                    'threads' => null,
                    'docker_image' => $dockerImage,
                    'startup' => $egg->startup,
                    // environment dibiarkan null: SubscriptionProvisionService
                    // mengisinya dari default_value egg variable.
                    'environment' => null,
                    'is_active' => true,
                ])
            );

            $this->command->info("Billing plan \"{$plan['name']}\" disiapkan (harga placeholder).");
        }
    }
}
