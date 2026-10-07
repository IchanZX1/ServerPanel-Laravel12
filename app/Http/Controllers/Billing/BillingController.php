<?php

namespace Pterodactyl\Http\Controllers\Billing;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Jobs\Billing\MarkInvoicePaidJob;
use Pterodactyl\Jobs\Billing\VerifyInvoicePaymentJob;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Models\Billing\BillingPlan;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Services\Billing\PakasirGatewayService;

class BillingController extends Controller
{
    /**
     * List paket aktif (untuk halaman /store React).
     */
    public function plans(): JsonResponse
    {
        $plans = BillingPlan::query()
            ->where('is_active', true)
            ->with('egg:id,name')
            ->orderBy('price_cents')
            ->get();

        return response()->json($plans);
    }

    /**
     * Subscription milik user login.
     *
     * Dipaginasi: endpoint ini dipanggil banner /server/:id juga, dan tanpa
     * batas jumlah baris akan ikut membengkak seiring riwayat pembelian.
     * Relasi `invoices` tidak ikut di-load — pakai `pending_invoice` supaya
     * satu baris subscription tidak menarik seluruh invoice-nya.
     */
    public function subscriptions(Request $request): JsonResponse
    {
        $subscriptions = BillingSubscription::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'plan:id,name,price_cents,duration_days',
                'server:id,name,status',
                'pendingInvoice:id,subscription_id,status,type',
            ])
            ->latest()
            ->paginate($this->perPage($request));

        return response()->json($subscriptions);
    }

    /**
     * Batas baris per halaman. Dikunci 50 agar query tidak bisa diminta
     * tanpa batas lewat `?per_page=`.
     */
    private function perPage(Request $request, int $default = 25, int $max = 50): int
    {
        $perPage = (int) $request->query('per_page', $default);

        return max(1, min($perPage, $max));
    }

    /**
     * Fallback sinkronisasi: invoice pending yang sudah lewat deadline
     * langsung di-expire + payload dibersihkan saat list dibaca, supaya
     * history tidak nyangkut "pending" bila scheduler belum jalan.
     */
    private function syncExpiry(BillingInvoice $invoice): BillingInvoice
    {
        if ($invoice->isExpiredByTime()) {
            $invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            $invoice->clearPaymentPayload();
            $invoice->refresh();
        }

        return $invoice;
    }

    /**
     * Invoice milik user login.
     *
     * Dipaginasi supaya riwayat panjang tidak menarik seluruh baris sekaligus.
     * `syncExpiry` hanya dijalankan pada baris di halaman ini — invoice lain
     * tetap ditangani scheduler `billing:expire-invoices`.
     */
    public function invoices(Request $request): JsonResponse
    {
        $invoices = BillingInvoice::query()
            ->where('user_id', $request->user()->id)
            ->with('subscription:id,plan_id,server_id')
            ->latest()
            ->paginate($this->perPage($request));

        $invoices->getCollection()->transform(fn (BillingInvoice $invoice) => $this->syncExpiry($invoice));

        return response()->json($invoices);
    }

    /**
     * Checkout: buat subscription pending + invoice initial via gateway.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:billing_plans,id',
            'server_name' => 'required|string|min:3|max:191',
        ]);

        $user = $request->user();
        $plan = BillingPlan::query()->findOrFail($validated['plan_id']);

        if (!$plan->is_active) {
            return response()->json(['message' => 'Paket tidak aktif.'], 422);
        }

        // Registrasi publik tidak tepercaya: email harus diverifikasi dulu
        // sebelum bisa membeli. Cegah akun massal dengan email sampah.
        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Verifikasi email Anda terlebih dahulu sebelum membeli server.',
            ], 403);
        }

        // order_id harus ada SEBELUM panggilan gateway: Pakasir menaruhnya di
        // path URL. UUID dipakai karena aman untuk path, unik, dan tidak pernah
        // dipakai ulang — penting karena create-transaction bersifat
        // find-or-create: order_id yang diulang dengan body berbeda berperilaku
        // tidak terdefinisi di sisi gateway.
        $orderId = 'SP-' . Str::uuid()->toString();

        // Dev auto-paid: jangan panggil gateway sama sekali. Kalau API key
        // lokal kosong / gateway mati, checkout tetap jalan.
        if ($this->devAutoPaidEnabled()) {
            $orderId = 'dev-' . Str::uuid()->toString();
            $payment = [
                'txn_id' => null,
                'qr_string' => null,
                'expired_at' => null,
                'total_payment' => $plan->price_cents,
                'fee' => null,
                'is_sandbox' => null,
            ];
        } else {
            $gateway = app()->make(PakasirGatewayService::class);
            $payment = $gateway->createQrisTransaction(
                amount: $plan->price_cents,
                orderId: $orderId,
            );
        }

        $result = DB::transaction(function () use ($user, $plan, $payment, $validated, $orderId) {
            $subscription = BillingSubscription::query()->create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'server_name' => $validated['server_name'],
                'status' => BillingSubscription::STATUS_PENDING_PAYMENT,
            ]);

            $invoice = BillingInvoice::query()->create([
                'subscription_id' => $subscription->id,
                'user_id' => $user->id,
                'order_id' => $orderId,
                'inv_id' => $payment['txn_id'] ?? null,
                'amount_cents' => $plan->price_cents,
                'total_payment_cents' => $payment['total_payment'] ?? $plan->price_cents,
                // QRIS tidak punya halaman pembayaran; QR dirender panel dari
                // qr_string. Kolom ini dibiarkan null secara sengaja.
                'redirect_url' => null,
                'qr_string' => $payment['qr_string'] ?? null,
                'gateway_expires_at' => PakasirGatewayService::parseExpiry($payment['expired_at'] ?? null),
                'status' => BillingInvoice::STATUS_PENDING,
                'type' => BillingInvoice::TYPE_INITIAL,
            ]);

            return [$subscription, $invoice];
        });

        [$subscription, $invoice] = $result;

        // DEVELOPMENT ONLY: tandai PAID + provision langsung, tanpa gateway.
        // Proteksi ganda (flag config DAN bukan production) — sama seperti
        // ssl_verify_disabled. Di production blok ini tidak pernah jalan.
        if ($this->devAutoPaidEnabled()) {
            $invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => now()]);
            MarkInvoicePaidJob::dispatchSync($invoice);

            Log::warning('Billing: dev auto-paid aktif — invoice ditandai PAID tanpa verifikasi gateway', [
                'invoice_id' => $invoice->id,
                'subscription_id' => $subscription->id,
            ]);

            return response()->json([
                'subscription' => $subscription->fresh(),
                'invoice' => $invoice->fresh(),
                'redirect_url' => null,
                'qr_string' => null,
            ], 201);
        }

        // Jaring pengaman: scheduler `billing:verify-pending` yang mem-poll tiap
        // menit, webhook yang menangani mayoritas pembayaran. Dispatch di sini
        // hanya relevan kalau ada queue worker — pada QUEUE_CONNECTION=sync
        // delay() diabaikan dan job jalan inline.
        VerifyInvoicePaymentJob::dispatch($invoice)
            ->delay(now()->addSeconds(max((int) config('billing.poll_interval_seconds'), 10)))
            ->onQueue('billing');

        return response()->json([
            'subscription' => $subscription,
            'invoice' => $invoice,
            'redirect_url' => $invoice->redirect_url,
            'qr_string' => $invoice->qr_string,
        ], 201);
    }

    /**
     * Apakah auto-PAID dev boleh jalan. Selalu false di production.
     */
    private function devAutoPaidEnabled(): bool
    {
        return (bool) config('billing.dev_auto_paid') && !app()->isProduction();
    }

    /**
     * Detail satu invoice milik user (halaman /store/invoice/{id}).
     *
     * Payload pembayaran (qr_string + redirect_url) hanya dikirim selama
     * invoice masih pending dan belum lewat deadline.
     */
    public function show(Request $request, BillingInvoice $invoice): JsonResponse
    {
        if ($invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $expired = $invoice->isExpiredByTime();
        if ($expired) {
            // Sinkronkan status begitu deadline lewat, sekaligus bersihkan payload.
            $invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            $invoice->clearPaymentPayload();
            $invoice->refresh();
        }

        $canPay = $invoice->isPending() && !$expired;

        // Sisa waktu dihitung dari deadline sebenarnya, bukan dari konstanta
        // config: batas bayar datang dari Pakasir (QRIS bisa berlaku berjam-jam),
        // jadi countdown di panel harus mencerminkan umur QR yang sebenarnya.
        // Aritmetika timestamp langsung, bukan diffInSeconds() — semantik tanda
        // method itu berbeda antara Carbon 2 dan 3.
        $lifetimeMinutes = (int) config('billing.invoice_lifetime_minutes', 3);
        if ($canPay) {
            $remainingSeconds = $invoice->paymentDeadline()->getTimestamp() - now()->getTimestamp();
            $lifetimeMinutes = max(1, (int) ceil($remainingSeconds / 60));
        }

        return response()->json([
            'invoice' => $invoice,
            'subscription' => $invoice->subscription()->with(['plan', 'server'])->first(),
            'redirect_url' => $canPay ? $invoice->redirect_url : null,
            'qr_string' => $canPay ? $invoice->qr_string : null,
            'expires_at' => $canPay ? $invoice->paymentDeadline()->toIso8601String() : null,
            'can_pay' => $canPay,
            'lifetime_minutes' => $lifetimeMinutes,
        ]);
    }

    /**
     * Trigger verifikasi manual ("Saya sudah bayar").
     *
     * Dijalankan SINKRON lewat job yang sama dengan scheduler, supaya tombol
     * ini langsung memberi status terbaru alih-alih hanya menjadwalkan poll.
     * Idempoten: aman dipanggil berulang kali.
     */
    public function checkInvoice(Request $request, BillingInvoice $invoice): JsonResponse
    {
        if ($invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if (!$invoice->isPending()) {
            return response()->json(['invoice' => $invoice->fresh()]);
        }

        try {
            dispatch_sync(new VerifyInvoicePaymentJob($invoice));
        } catch (\Throwable $e) {
            // Job sync menelan exception provisioning ke sini (lihat MarkInvoicePaidJob).
            // Log dengan level error supaya kegagalan pembuatan server tidak silent.
            Log::error('Billing: verifikasi manual gagal', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
                'exception' => get_class($e),
            ]);

            return response()->json([
                'message' => 'Belum bisa memverifikasi pembayaran, coba lagi sebentar lagi.',
                'invoice' => $invoice->fresh(),
            ], 200);
        }

        $invoice->refresh();

        // Sudah PAID tapi server belum terbuat: provisioning gagal. Beri pesan
        // jujur, jangan bilang "sedang disiapkan" (server_id masih null).
        if ($invoice->status === BillingInvoice::STATUS_PAID) {
            $subscription = $invoice->subscription()->first();
            if (!is_null($subscription) && is_null($subscription->server_id)) {
                Log::error('Billing: invoice paid tanpa server (provisioning gagal)', [
                    'invoice_id' => $invoice->id,
                    'subscription_id' => $subscription->id,
                ]);

                return response()->json([
                    'message' => 'Pembayaran diterima, tetapi server belum berhasil dibuat. Admin sudah dicatat untuk menindaklanjuti.',
                    'invoice' => $invoice,
                ]);
            }
        }

        $message = match ($invoice->status) {
            BillingInvoice::STATUS_PAID => 'Pembayaran diterima. Server sedang disiapkan.',
            BillingInvoice::STATUS_EXPIRED => 'Invoice sudah kedaluwarsa.',
            default => 'Belum ada pembayaran yang terdeteksi. Coba lagi beberapa saat.',
        };

        return response()->json(['message' => $message, 'invoice' => $invoice]);
    }

    /**
     * Perpanjang manual: buat invoice renewal.
     */
    public function renew(Request $request, BillingSubscription $subscription): JsonResponse
    {
        if ($subscription->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if (!$request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Verifikasi email Anda terlebih dahulu sebelum memperpanjang server.',
            ], 403);
        }

        if (!in_array($subscription->status, [BillingSubscription::STATUS_ACTIVE, BillingSubscription::STATUS_SUSPENDED], true)) {
            return response()->json(['message' => 'Subscription tidak bisa diperpanjang pada status ini.'], 422);
        }

        // Jangan dobel: tolak bila masih ada renewal pending.
        $pending = $subscription->invoices()
            ->where('status', BillingInvoice::STATUS_PENDING)
            ->where('type', BillingInvoice::TYPE_RENEWAL)
            ->exists();
        if ($pending) {
            return response()->json(['message' => 'Sudah ada invoice renewal yang menunggu pembayaran.'], 422);
        }

        $user = $request->user();
        $plan = $subscription->plan()->firstOrFail();

        $orderId = 'SP-' . Str::uuid()->toString();

        $gateway = app()->make(PakasirGatewayService::class);
        $payment = $gateway->createQrisTransaction(
            amount: $plan->price_cents,
            orderId: $orderId,
        );

        $invoice = BillingInvoice::query()->create([
            'subscription_id' => $subscription->id,
            'user_id' => $user->id,
            'order_id' => $orderId,
            'inv_id' => $payment['txn_id'] ?? null,
            'amount_cents' => $plan->price_cents,
            'total_payment_cents' => $payment['total_payment'] ?? $plan->price_cents,
            // QRIS tidak punya halaman pembayaran; lihat catatan di checkout().
            'redirect_url' => null,
            'qr_string' => $payment['qr_string'] ?? null,
            'gateway_expires_at' => PakasirGatewayService::parseExpiry($payment['expired_at'] ?? null),
            'status' => BillingInvoice::STATUS_PENDING,
            'type' => BillingInvoice::TYPE_RENEWAL,
        ]);

        VerifyInvoicePaymentJob::dispatch($invoice)
            ->delay(now()->addSeconds(max((int) config('billing.poll_interval_seconds'), 10)))
            ->onQueue('billing');

        return response()->json([
            'invoice' => $invoice,
            'redirect_url' => $invoice->redirect_url,
            'qr_string' => $invoice->qr_string,
        ], 201);
    }

    /**
     * Halaman React: mount via Base\IndexController agar konsisten dengan
     * halaman user lain. Controller ini hanya untuk JSON API.
     */
}
