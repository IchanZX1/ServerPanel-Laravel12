import React, { useState } from 'react';
import { useStoreState } from 'easy-peasy';
import tw from 'twin.macro';
import Spinner from '@/components/elements/Spinner';
import MaterialIcon from '@/components/elements/MaterialIcon';
import resendVerification from '@/api/account/resendVerification';
import { ApplicationStore } from '@/state';

/**
 * Banner peringatan email belum diverifikasi.
 *
 * Muncul di atas konten dashboard selama `emailVerified` false. Tanpa ini user
 * hasil registrasi publik akan bingung kenapa tombol Beli ditolak 403.
 */
export default () => {
    const emailVerified = useStoreState((state: ApplicationStore) => state.user.data?.emailVerified);
    const email = useStoreState((state: ApplicationStore) => state.user.data?.email);

    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    if (emailVerified !== false) {
        return null;
    }

    const onResend = () => {
        if (loading) return;
        setLoading(true);
        resendVerification()
            .then(() => setSent(true))
            .catch(() => setSent(false))
            .then(() => setLoading(false));
    };

    return (
        <div
            role={'alert'}
            css={tw`relative overflow-hidden rounded-xl bg-warning-bg p-4 shadow-sm`}
        >
            <div css={tw`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
                <div css={tw`flex items-center gap-3`}>
                    <div
                        css={tw`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning`}
                    >
                        <MaterialIcon name={'mark_email_unread'} />
                    </div>
                    <div css={tw`flex flex-col`}>
                        <span css={tw`font-title-md text-title-md text-text-primary`}>
                            {sent ? 'Tautan verifikasi terkirim' : 'Email belum diverifikasi'}
                        </span>
                        <span css={tw`font-body-sm text-body-sm text-text-secondary`}>
                            {sent ? (
                                <>
                                    Tautan verifikasi sudah dikirim ulang ke{' '}
                                    <code
                                        css={tw`rounded bg-surface-container px-1.5 py-0.5 font-label-micro text-label-micro text-brand`}
                                    >
                                        {email}
                                    </code>
                                    . Cek inbox Anda.
                                </>
                            ) : (
                                <>
                                    Alamat email{' '}
                                    <code
                                        css={tw`rounded bg-surface-container px-1.5 py-0.5 font-label-micro text-label-micro text-brand`}
                                    >
                                        {email}
                                    </code>{' '}
                                    belum diverifikasi. Verifikasi diperlukan sebelum bisa membeli server.
                                </>
                            )}
                        </span>
                    </div>
                </div>
                {!sent && (
                    <button
                        type={'button'}
                        onClick={onResend}
                        disabled={loading}
                        css={tw`flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-surface-container-high px-3.5 py-1.5 font-label-md text-label-md font-semibold text-warning shadow-sm transition-colors hover:bg-warning hover:text-surface-base disabled:opacity-60`}
                    >
                        <span>{loading ? 'Mengirim…' : 'Kirim ulang'}</span>
                        {loading ? <Spinner size={'small'} /> : <MaterialIcon name={'forward_to_inbox'} size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
};
