import React, { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps, useLocation } from 'react-router-dom';
import login from '@/api/auth/login';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import { useStoreState } from 'easy-peasy';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import Field from '@/components/elements/Field';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import Reaptcha from 'reaptcha';
import useFlash from '@/plugins/useFlash';

interface Values {
    username: string;
    password: string;
}

const LoginContainer = ({ history }: RouteComponentProps) => {
    const ref = useRef<Reaptcha>(null);
    const [token, setToken] = useState('');
    const { search } = useLocation();

    // Menandai bahwa token captcha yang sedang ditunggu memang diminta oleh
    // form ini. reCAPTCHA invisible bisa memanggil callback widget lama setelah
    // navigasi antar halaman auth; tanpa guard ini form login yang masih kosong
    // ikut ter-submit dan memunculkan "A username or email must be provided".
    const pendingCaptcha = useRef(false);

    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState((state) => state.settings.data!.recaptcha);

    useEffect(() => {
        clearFlashes();
    }, []);

    // Hasil klik tautan verifikasi email (VerifyEmailController redirect ke sini).
    useEffect(() => {
        const verified = new URLSearchParams(search).get('verified');

        if (verified === '1') {
            addFlash({
                type: 'success',
                title: 'Email terverifikasi',
                message: 'Email Anda sudah terverifikasi. Silakan login.',
            });
        } else if (verified === '0') {
            addFlash({
                type: 'error',
                title: 'Verifikasi gagal',
                message: 'Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta tautan baru dari dashboard.',
            });
        }
    }, [search]);

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();

        // If there is no token in the state yet, request the token and then abort this submit request
        // since it will be re-submitted when the recaptcha data is returned by the component.
        if (recaptchaEnabled && !token) {
            pendingCaptcha.current = true;
            ref.current!.execute().catch((error) => {
                console.error(error);

                pendingCaptcha.current = false;
                setSubmitting(false);
                clearAndAddHttpError({ error });
            });

            return;
        }

        login({ ...values, recaptchaData: token })
            .then((response) => {
                if (response.complete) {
                    // @ts-expect-error this is valid
                    window.location = response.intended || '/';
                    return;
                }

                history.replace('/auth/login/checkpoint', { token: response.confirmationToken });
            })
            .catch((error) => {
                console.error(error);

                setToken('');
                if (ref.current) ref.current.reset();

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });
    };

    return (
        <Formik
            onSubmit={onSubmit}
            initialValues={{ username: '', password: '' }}
            validationSchema={object().shape({
                username: string().required('A username or email must be provided.'),
                password: string().required('Please enter your account password.'),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <LoginFormContainer title={'Login to Continue'} css={tw`w-full flex`}>
                    <Field
                        light
                        type={'text'}
                        label={'Username or Email'}
                        name={'username'}
                        autoComplete={'username'}
                        autoFocus
                        disabled={isSubmitting}
                    />
                    <div css={tw`mt-6`}>
                        <Field
                            light
                            type={'password'}
                            label={'Password'}
                            name={'password'}
                            autoComplete={'current-password'}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div css={tw`mt-6`}>
                        <Button type={'submit'} size={'xlarge'} isLoading={isSubmitting} disabled={isSubmitting}>
                            Login
                        </Button>
                    </div>
                    {recaptchaEnabled && (
                        <Reaptcha
                            ref={ref}
                            size={'invisible'}
                            sitekey={siteKey || '_invalid_key'}
                            onVerify={(response) => {
                                // Callback dari widget yang sudah tidak relevan
                                // (halaman sudah berganti) diabaikan.
                                if (!pendingCaptcha.current) {
                                    return;
                                }

                                pendingCaptcha.current = false;
                                setToken(response);
                                submitForm();
                            }}
                            onExpire={() => {
                                pendingCaptcha.current = false;
                                setSubmitting(false);
                                setToken('');
                            }}
                        />
                    )}
                    <div css={tw`mt-6 flex flex-col gap-2 text-center`}>
                        <Link
                            to={'/auth/password'}
                            style={{ color: 'var(--z0ne-text-secondary, #a1a1aa)' }}
                            css={tw`text-xs tracking-wide no-underline hover:text-white transition-colors duration-150 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2`}
                        >
                            Forgot password?
                        </Link>
                        <div
                            style={{ color: 'var(--z0ne-text-muted, #71717a)' }}
                            css={tw`text-xs mt-2 pt-2 border-t border-neutral-800`}
                        >
                            Belum punya akun?{' '}
                            <Link
                                to={'/auth/register'}
                                style={{ color: 'var(--z0ne-accent-primary, #3b82f6)' }}
                                css={tw`font-medium no-underline hover:underline ml-1 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
                            >
                                Create Account
                            </Link>
                        </div>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
};

export default LoginContainer;
