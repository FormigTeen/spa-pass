import {useState, useEffect, ChangeEvent, FC} from 'react';
import {
    browserSupportsWebAuthn,
    startAuthentication,
    startRegistration
} from '@simplewebauthn/browser';
import './App.css';
import {
    ApolloClient,
    createHttpLink,
    InMemoryCache,
    useMutation,
    useQuery,
    gql, useLazyQuery,
} from "@apollo/client";
import {useEffectOnce} from "react-use";

const httpEcomLink = createHttpLink({
    uri: 'https://api-gateway.cvlb.tech/gql/v1/ecom',
    headers: { 'X-Api-Key': 'TOOYB1KQ6-FAUW-IH4W-LIEF1T4AE6E' },
    credentials: 'include',
});

const httpCoreLink = createHttpLink({
    uri: 'https://api-gateway.cvlb.tech/gql/v1/core',
    headers: { 'X-Api-Key': 'TOOYB1KQ6-FAUW-IH4W-LIEF1T4AE6E' },
    credentials: 'include',
});

const ecomClient = new ApolloClient({
    link: httpEcomLink,
    cache: new InMemoryCache(),
});

const coreClient = new ApolloClient({
    link: httpCoreLink,
    cache: new InMemoryCache(),
});

const useProfile = () => {
    const GET_PROFILE = gql`
        query {
            profile { email }
        }
    `;


    const { data, refetch } = useQuery(GET_PROFILE, { client: ecomClient });

    const email = data?.profile?.email || '';

    return {
        email,
        hasEmail: !!email && email.includes("@"),
        getEmail: refetch,
    };
};

const useCode = () => {
    const GET_CODE = gql`
        mutation getCode($email: String!) {
            sendEmailVerification(email: $email)
        }
    `;
    const [getCode] = useMutation(GET_CODE, { client: ecomClient });
    return { getCode };
};

const useLogin = () => {
    const LOGIN = gql`
        mutation login($email: String!, $code: String!) {
            accessKeySignIn(email: $email, code: $code)
        }
    `;
    const [toLogin] = useMutation(LOGIN, { client: ecomClient });
    return {
        toLogin,
    };
};

const usePasskey = () => {
    const REGISTER_PASSKEY_OPTIONS = gql`
        query {
            registerPasskeyOptions
        }
    `;

    const REGISTER_PASSKEY = gql`
        mutation registerPasskey($key: JSON!) {
            registerPasskey(key: $key)
        }
    `;

    const AUTH_PASSKEY_OPTIONS = gql`
        query {
            loginPasskeyOptions
        }
    `;

    const LOGIN_PASSKEY = gql`
        mutation registerPasskey($email: String!, $key: String!) {
            loginPasskey(email: $email, key: $key) {
                email
            }
        }
    `;

    const [getRegisterOptions, { data: registerOptions } ] = useLazyQuery(REGISTER_PASSKEY_OPTIONS, { client: coreClient });
    const [getAuthOptions, { data: authOptions } ] = useLazyQuery(AUTH_PASSKEY_OPTIONS, { client: coreClient });

    const [registerPasskey] = useMutation(REGISTER_PASSKEY, { client: coreClient });
    const [loginPasskey] = useMutation(LOGIN_PASSKEY, { client: coreClient });

    return {
        getRegisterOptions,
        getAuthOptions,

        registerOptions: registerOptions?.registerPasskeyOptions,
        authOptions,

        registerPasskey,
        loginPasskey,
    };

};

function App() {
    const { getEmail, hasEmail, email } = useProfile();
    const { registerOptions, getRegisterOptions, registerPasskey, getAuthOptions, loginPasskey, authOptions } = usePasskey()
    const [passkeyEmail, setPasskeyEmail]     = useState('');
    const [passkeyMessage, setPasskeyMessage] = useState('');
    const [passkeyError, setPasskeyError]     = useState('');
    const [inputEmail, setInputEmail] = useState('');
    const [inputCode, setInputCode]   = useState('');
    const [message, setMessage]       = useState('');
    const [error, setError]           = useState('');
    const [step, setStep] = useState<'email' | 'code'>('email');
    const { getCode }                 = useCode();
    const { toLogin }          = useLogin();


    useEffect(() => {
        if (hasEmail && !registerOptions) {
            getRegisterOptions()
        }
    }, [getRegisterOptions, hasEmail, registerOptions]);



    const handleAuthenticatePasskey = async () => {
        setPasskeyError('');
        setPasskeyMessage('');
        try {
            await getAuthOptions();

            const assertion = await startAuthentication({
                optionsJSON: authOptions,
            });

            const { data } = await loginPasskey({
                variables: {
                    email: passkeyEmail,
                    key: assertion,
                },
            });

            if (!data.loginPasskey?.email) {
                throw new Error('Falha ao autenticar com passkey');
            }
            setPasskeyMessage(`Autenticado como ${data.loginPasskey.email}`);
        } catch (err: unknown) {
            setPasskeyError(
                err instanceof Error ? err.message : 'Erro desconhecido ao autenticar'
            );
        }
    };

    useEffectOnce(() => {
        if (!browserSupportsWebAuthn()) {
            setError("Seu navegador não suporta WebAuthn.");
        }
    });

    const createPasskey = async () => {
        try {
            if (!registerOptions) {
                throw new Error('Nenhuma opção de registro disponível');
            }
            await startRegistration({optionsJSON: registerOptions})
                .then(
                    aResponse => registerPasskey({
                        variables: {
                            key: aResponse,
                        }
                    })
                ).then(aResponse => {
                    if ( !aResponse.data.registerPasskey ) {
                        throw new Error('Erro ao registrar passkey');
                    }
                    return true
                })
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message || 'Erro ao registrar passkey');
            } else {
                setError('Erro desconhecido');
            }
        }
    }
    const handleSendCode = async () => {
        setError('');
        setMessage('');
        try {
            await getCode({ variables: { email: inputEmail } });
            setMessage(`Código enviado para ${inputEmail}`);
            setStep('code');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'Erro ao confirmar código');
            } else {
                setError('Erro desconhecido');
            }
        }
    };


    const handleConfirmCode = async () => {
        setError(''); setMessage('');
        try {
            await toLogin({ variables: { email: inputEmail, code: inputCode } });
            await getEmail();
            await getRegisterOptions();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'Erro ao confirmar código');
            } else {
                setError('Erro desconhecido');
            }
        }
    };

    const isStep = (targets: string[]) => targets.some(target => step === target);


    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold text-center mb-8">React (Passkey)</h1>
            <div className="shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Registro de Passkey</h2>
                {isStep(['email']) && (<EmailInput
                    value={inputEmail}
                    onValue={setInputEmail}
                />)}

                {isStep(['code']) && (<CodeInput
                    value={inputCode}
                    onValue={setInputCode}
                />)}

                <ActionGrid
                    onBack={() => setStep('email')}
                    onNext={() => setStep('code')}
                    onGetCode={handleSendCode}
                    onConfirmCode={handleConfirmCode}
                    hasCode={isStep(['code'])}
                    disabledBack={isStep(['email'])}
                    disabledNext={!inputEmail.includes('@')}
                    disabledAction={
                        isStep(['email']) && !inputEmail.includes('@') ||
                        isStep(['code']) && !inputCode
                    }
                />

                {/* --- Botão Registrar Passkey --- */}
                {registerOptions && (
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={createPasskey}
                            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                        >
                            Registrar Passkey
                        </button>
                    </div>
                )}

                {/* --- Mensagens de estado --- */}
                {hasEmail && (
                    <p className="text-green-600 font-medium mt-4">
                        ✅ Autenticado como: {email}
                    </p>
                )}
                {message && <p className="text-green-600 mt-2">{message}</p>}
                {error   && <p className="text-red-600 mt-2">{error}</p>}
            </div>
            {/* 5) Nova seção: Autenticar com Passkey */}
            <div className="shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Autenticação com Passkey</h2>

                <div className="mb-4">
                    <label htmlFor="passkeyEmail" className="block mb-1">
                        Digite seu e-mail
                    </label>
                    <input
                        id="passkeyEmail"
                        type="email"
                        value={passkeyEmail}
                        onChange={e => setPasskeyEmail(e.target.value)}
                        className="border rounded-md p-2 w-full"
                    />
                </div>

                <button
                    onClick={handleAuthenticatePasskey}
                    disabled={!passkeyEmail.includes('@')}
                    className="w-full px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
                >
                    Autenticar com Passkey
                </button>

                {passkeyMessage && (
                    <p className="text-green-600 mt-2">{passkeyMessage}</p>
                )}
                {passkeyError && (
                    <p className="text-red-600 mt-2">{passkeyError}</p>
                )}
            </div>
        </div>
    );
}

type EmailInputProps = {
    value?: string;
    onValue?: (value: string) => unknown;
}

const EmailInput: FC<EmailInputProps> = ({
                                             value = "",
                                             onValue = () => null,
                                         }) => {

    const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        onValue(value);
    }

    return (
        <div className="mb-6">
            <label htmlFor="email" className="block mb-1">
                Digite seu e-mail
            </label>
            <input
                id="email"
                type="email"
                value={value}
                onChange={handleInput}
                className="border rounded-md p-2 w-full"
            />
        </div>
    );
}

type CodeInputProps = {
    value?: string;
    onValue?: (value: string) => unknown;
}
const CodeInput: FC<CodeInputProps> = ({
                                           value = "",
                                           onValue = () => null,

                                       }) => {

    const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        onValue(value);
    }

    return (
        <div className="mb-6">
            <label htmlFor="code" className="block mb-1">
                Digite o código recebido
            </label>
            <input
                id="code"
                type="text"
                value={value}
                onChange={handleInput}
                className="border rounded-md p-2 w-full max-w-xs"
            />
        </div>
    )
}

type ActionGridProps = {
    onBack?: () => unknown;
    onNext?: () => unknown;
    disabledBack?: boolean;
    disabledNext?: boolean;
    disabledAction?: boolean;
    hasCode?: boolean;
    onGetCode?: () => unknown;
    onConfirmCode?: () => unknown;
}
export const ActionGrid: FC<ActionGridProps> = ({
                                                    onBack = () => null,
                                                    onNext = () => null,
                                                    onGetCode = () => null,
                                                    onConfirmCode = () => null,
                                                    hasCode = false,
                                                    disabledBack = false,
                                                    disabledNext = false,
                                                    disabledAction = false,

}) => {
    return (
        <div className="grid grid-cols-3 gap-4 mt-4">
            <button
                onClick={onBack}
                disabled={disabledBack}
                className="w-full px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            >
                Voltar
            </button>

            {!hasCode && (<button
                onClick={onGetCode}
                disabled={disabledAction}
                className={`w-full px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700'
                        disabled:bg-gray-400`}
            >
                Enviar Código
            </button>)}

            {hasCode && <button
                onClick={onConfirmCode}
                disabled={disabledAction}
                className={`w-full px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400`}
            >
                Confirmar Código
            </button>}

            <button
                onClick={onNext}
                disabled={disabledNext}
                className="w-full px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            >
                Avançar
            </button>
        </div>
    )
}

export default App;
