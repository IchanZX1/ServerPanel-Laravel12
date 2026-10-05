import React, { useRef, useState } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import register from '@/api/auth/register';
import { httpErrorToHuman } from '@/api/http';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import { useStoreState } from 'easy-peasy';
import { Formik, FormikHelpers } from 'formik';
import { object, ref as yupRef, string } from 'yup';
import Field from '@/components/elements/Field';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import Reaptcha from 'reaptcha';
import useFlash from '@/plugins/useFlash';

interface Values {
    nameFirst: string;
    nameLast: string;
    username: string;
    email: string;
    password: string;
    passwordConfirmation: string;
}

const RegisterContainer = ({ history }: RouteComponentProps) => {
    const captchaRef = useRef<Reaptcha>(null);
    const [token, setToken] = useState('');
    const [registered, setRegistered] = useState(false);

    const { clearFlashes, addFlash, addError } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState((state) => state.settings.data!.recaptcha);

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();

        // Bila recaptcha aktif tapi token belum ada, minta token dulu lalu batalkan
        // submit ini — form akan di-submit ulang saat recaptcha memanggil onVerify.
        if (recaptchaEnabled && !token) {
            captchaRef.current!.execute().catch((error) => {
                console.error(error);

                setSubmitting(false);
                addError(httpErrorToHuman(error));
            });

            return;
        }

        register({ ...values, recaptchaData: token })
            .then((response) => {
                setSubmitting(false);
                setRegistered(true);
                addFlash({
                    type: 'success',
                    title: 'Success',
                    message: response.message || 'Akun berhasil dibuat, silakan login.',
                });

                // Sesuai permintaan: tidak auto-login, arahkan ke halaman login.
                history.replace('/auth/login');
            })
            .catch((error) => {
                console.error(error);

                setToken('');
                if (captchaRef.current) captchaRef.current.reset();

                setSubmitting(false);
                addError(httpErrorToHuman(error));
            });
    };

    if (registered) {
        return null;
    }

    return (
        <Formik
            onSubmit={onSubmit}
            initialValues={{
                nameFirst: '',
                nameLast: '',
                username: '',
                email: '',
                password: '',
                passwordConfirmation: '',
            }}
            validationSchema={object().shape({
                nameFirst: string().required('Nama depan wajib diisi.').max(191),
                nameLast: string().required('Nama belakang wajib diisi.').max(191),
                username: string()
                    .required('Username wajib diisi.')
                    .min(3, 'Username minimal 3 karakter.')
                    .max(191)
                    .matches(
                        /^[a-z0-9]([\w.-]+)[a-z0-9]$/,
                        'Username harus diawali dan diakhiri huruf/angka, hanya boleh berisi huruf, angka, titik, strip, dan garis bawah.'
                    ),
                email: string().email('Alamat email tidak valid.').required('Alamat email wajib diisi.'),
                password: string()
                    .required('Password wajib diisi.')
                    .min(8, 'Password minimal 8 karakter.'),
                passwordConfirmation: string()
                    .required('Konfirmasi password wajib diisi.')
                    // @ts-expect-error this is valid
                    .oneOf([yupRef('password'), null], 'Konfirmasi password tidak cocok.'),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <LoginFormContainer title={'Create Account'} css={tw`w-full flex`}>
                    <div css={tw`flex flex-col sm:flex-row gap-4`}>
                        <div css={tw`w-full sm:w-1/2`}>
                            <Field
                                light
                                type={'text'}
                                label={'First Name'}
                                name={'nameFirst'}
                                autoComplete={'given-name'}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div css={tw`w-full sm:w-1/2`}>
                            <Field
                                light
                                type={'text'}
                                label={'Last Name'}
                                name={'nameLast'}
                                autoComplete={'family-name'}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div css={tw`mt-6`}>
                        <Field
                            light
                            type={'text'}
                            label={'Username'}
                            name={'username'}
                            autoComplete={'username'}
                            autoFocus
                            description={'Huruf kecil, angka, titik, strip, dan garis bawah.'}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div css={tw`mt-6`}>
                        <Field
                            light
                            type={'email'}
                            label={'Email'}
                            name={'email'}
                            autoComplete={'email'}
                            description={'Email harus unik dan berisi format yang valid.'}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div css={tw`mt-6`}>
                        <Field
                            light
                            type={'password'}
                            label={'Password'}
                            name={'password'}
                            autoComplete={'new-password'}
                            description={'Password minimal 8 karakter.'}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div css={tw`mt-6`}>
                        <Field
                            light
                            type={'password'}
                            label={'Confirm Password'}
                            name={'passwordConfirmation'}
                            autoComplete={'new-password'}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div css={tw`mt-6`}>
                        <Button type={'submit'} size={'xlarge'} isLoading={isSubmitting} disabled={isSubmitting}>
                            Create Account
                        </Button>
                    </div>

                    {recaptchaEnabled && (
                        <Reaptcha
                            ref={captchaRef}
                            size={'invisible'}
                            sitekey={siteKey || '_invalid_key'}
                            onVerify={(response) => {
                                setToken(response);
                                submitForm();
                            }}
                            onExpire={() => {
                                setSubmitting(false);
                                setToken('');
                            }}
                        />
                    )}

                    <div css={tw`mt-6 text-center`}>
                        <Link
                            to={'/auth/login'}
                            style={{ color: 'var(--z0ne-text-secondary, #a1a1aa)' }}
                            css={tw`text-xs tracking-wide no-underline hover:text-white transition-colors duration-150 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2`}
                        >
                            Sudah punya akun? Login
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
};

export default RegisterContainer;
