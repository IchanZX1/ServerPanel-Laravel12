import http from '@/api/http';

/**
 * Minta kirim ulang tautan verifikasi email untuk user yang sedang login.
 * Server membatasi 3 permintaan per menit.
 */
export default (): Promise<string> => {
    return new Promise((resolve, reject) => {
        http.post('/account/verify-email/resend')
            .then((response) => resolve(response.data.message))
            .catch(reject);
    });
};
