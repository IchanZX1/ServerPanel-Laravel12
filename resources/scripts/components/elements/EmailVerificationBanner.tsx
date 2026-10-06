import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from 'easy-peasy';
import tw from 'twin.macro';
import Spinner from '@/components/elements/Spinner';
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
            css={tw`flex flex-col sm:flex-row sm:items-center gap-3 p-3 mb-4 rounded-md border border-yellow-600 bg-yellow-500 bg-opacity-10`}
        >
            <FontAwesomeIcon icon={faEnvelopeOpenText} css={tw`text-yellow-400 flex-shrink-0`} aria-hidden={'true'} />
            <div css={tw`flex-1 text-sm`}>
                {sent ? (
                    <p css={tw`text-yellow-200`}>
                        <FontAwesomeIcon icon={faCheckCircle} css={tw`mr-2`} aria-hidden={'true'} />
                        Tautan verifikasi sudah dikirim ulang ke <strong>{email}</strong>. Cek inbox Anda.
                    </p>
                ) : (
                    <p css={tw`text-yellow-200`}>
                        Email <strong>{email}</strong> belum diverifikasi. Verifikasi diperlukan sebelum bisa membeli
                        server.
                    </p>
                )}
            </div>
            {!sent && (
                <button
                    type={'button'}
                    onClick={onResend}
                    disabled={loading}
                    css={tw`text-sm font-medium px-3 py-1.5 rounded-md bg-yellow-500 text-neutral-900 hover:bg-yellow-400 disabled:opacity-60 flex-shrink-0`}
                >
                    {loading ? <Spinner size={'small'} /> : 'Kirim ulang'}
                </button>
            )}
        </div>
    );
};
