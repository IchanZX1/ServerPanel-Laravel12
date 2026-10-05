import http from '@/api/http';

export interface RegisterData {
    nameFirst: string;
    nameLast: string;
    username: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    recaptchaData?: string | null;
}

export interface RegisterResponse {
    complete: boolean;
    message: string;
}

export default ({
    nameFirst,
    nameLast,
    username,
    email,
    password,
    passwordConfirmation,
    recaptchaData,
}: RegisterData): Promise<RegisterResponse> => {
    return new Promise((resolve, reject) => {
        http.get('/sanctum/csrf-cookie')
            .then(() =>
                http.post('/auth/register', {
                    name_first: nameFirst,
                    name_last: nameLast,
                    username,
                    email,
                    password,
                    password_confirmation: passwordConfirmation,
                    'g-recaptcha-response': recaptchaData,
                })
            )
            .then((response) => {
                if (!(response.data instanceof Object)) {
                    return reject(new Error('An error occurred while processing the registration request.'));
                }

                return resolve({
                    complete: response.data.data.complete,
                    message: response.data.data.message,
                });
            })
            .catch(reject);
    });
};
