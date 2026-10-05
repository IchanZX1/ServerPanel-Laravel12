<?php

namespace Pterodactyl\Http\Controllers\Billing;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Jobs\Billing\VerifyInvoicePaymentJob;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Models\Billing\BillingPlan;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Services\Billing\SociabuzzGatewayService;

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
     */
    public function subscriptions(Request $request): JsonResponse
    {
        $subscriptions = BillingSubscription::query()
            ->where('user_id', $request->user()->id)
            ->with(['plan:id,name,price_cents,duration_days', 'server:id,name,status', 'invoices'])
            ->latest()
            ->get();

        return response()->json($subscriptions);
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
     */
    public function invoices(Request $request): JsonResponse
    {
        $invoices = BillingInvoice::query()
            ->where('user_id', $request->user()->id)
            ->with('subscription:id,plan_id,server_id')
            ->latest()
            ->get();

        $invoices->transform(fn (BillingInvoice $invoice) => $this->syncExpiry($invoice));

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

        $gateway = app()->make(SociabuzzGatewayService::class);
        $payment = $gateway->createPayment(
            amount: $plan->price_cents,
            fullname: trim(($user->name_first ?? '') . ' ' . ($user->name_last ?? '')) ?: $user->username,
            email: $user->email,
            note: "Billing #plan-{$plan->id} - {$plan->name}",
        );

        $result = DB::transaction(function () use ($user, $plan, $payment, $validated) {
            $subscription = BillingSubscription::query()->create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'server_name' => $validated['server_name'],
                'status' => BillingSubscription::STATUS_PENDING_PAYMENT,
            ]);

            $invoice = BillingInvoice::query()->create([
                'subscription_id' => $subscription->id,
                'user_id' => $user->id,
                'order_id' => $payment['order_id'],
                'inv_id' => $payment['inv_id'] ?? null,
                'amount_cents' => $plan->price_cents,
                'redirect_url' => $payment['redirect_url'],
                'qr_string' => $payment['qr_string'] ?? null,
                'gateway_expires_at' => SociabuzzGatewayService::parseExpiry($payment['expiration_date'] ?? null),
                'status' => BillingInvoice::STATUS_PENDING,
                'type' => BillingInvoice::TYPE_INITIAL,
            ]);

            return [$subscription, $invoice];
        });

        [$subscription, $invoice] = $result;

        // Mulai polling verify — invoice gateway expired ~3 menit.
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

        return response()->json([
            'invoice' => $invoice,
            'subscription' => $invoice->subscription()->with(['plan', 'server'])->first(),
            'redirect_url' => $canPay ? $invoice->redirect_url : null,
            'qr_string' => $canPay ? $invoice->qr_string : null,
            'expires_at' => $canPay ? $invoice->paymentDeadline()->toIso8601String() : null,
            'can_pay' => $canPay,
            'lifetime_minutes' => (int) config('billing.invoice_lifetime_minutes', 3),
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

        $gateway = app()->make(SociabuzzGatewayService::class);
        $payment = $gateway->createPayment(
            amount: $plan->price_cents,
            fullname: trim(($user->name_first ?? '') . ' ' . ($user->name_last ?? '')) ?: $user->username,
            email: $user->email,
            note: "Renewal #{$subscription->id} - {$plan->name}",
        );

        $invoice = BillingInvoice::query()->create([
            'subscription_id' => $subscription->id,
            'user_id' => $user->id,
            'order_id' => $payment['order_id'],
            'inv_id' => $payment['inv_id'] ?? null,
            'amount_cents' => $plan->price_cents,
            'redirect_url' => $payment['redirect_url'],
            'qr_string' => $payment['qr_string'] ?? null,
            'gateway_expires_at' => SociabuzzGatewayService::parseExpiry($payment['expiration_date'] ?? null),
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
