import { useState, useEffect } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import './App.css';
import {
    ApolloClient,
    createHttpLink,
    InMemoryCache,
    useMutation,
    useQuery,
    gql,
} from "@apollo/client";

const httpLink = createHttpLink({
    uri: 'https://api-gateway.cvlb.tech/gql/v1/ecom',
    headers: { 'X-Api-Key': 'TOOYB1KQ6-FAUW-IH4W-LIEF1T4AE6E' },
    credentials: 'include',
});
const client = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
});

const useProfile = () => {
    const GET_PROFILE = gql`
        query {
            profile { email }
        }
    `;


    const { data, refetch } = useQuery(GET_PROFILE, { client });

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
    const [getCode] = useMutation(GET_CODE, { client });
    return { getCode };
};

const useLogin = () => {
    const LOGIN = gql`
        mutation login($email: String!, $code: String!) {
            accessKeySignIn(email: $email, code: $code)
        }
    `;
    const [toLogin] = useMutation(LOGIN, { client });
    return {
        toLogin,
    };
};

function App() {
    const [inputEmail, setInputEmail] = useState('');
    const [inputCode, setInputCode]   = useState('');
    const [message, setMessage]       = useState('');
    const [error, setError]           = useState('');
    const { getEmail, hasEmail, email }         = useProfile();
    const [step, setStep] = useState<'email' | 'code'>('email');
    const { getCode }                 = useCode();
    const { toLogin }          = useLogin();

    useEffect(() => {
        if (!browserSupportsWebAuthn()) {
            setError("Seu navegador não suporta WebAuthn.");
        }
    }, []);

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
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'Erro ao confirmar código');
            } else {
                setError('Erro desconhecido');
            }
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold text-center mb-8">React (Passkey)</h1>
            <div className="shadow rounded-lg p-6 mb-8">
                {/* --- Formulário de acordo com o step --- */}
                {step === 'email' && (
                    <div className="mb-6">
                        <label htmlFor="email" className="block mb-1">
                            Digite seu e-mail
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={inputEmail}
                            onChange={e => setInputEmail(e.target.value)}
                            className="border rounded-md p-2 w-full max-w-xs"
                        />
                    </div>
                )}

                {step === 'code' && (
                    <div className="mb-6">
                        <label htmlFor="code" className="block mb-1">
                            Digite o código recebido
                        </label>
                        <input
                            id="code"
                            type="text"
                            value={inputCode}
                            onChange={e => setInputCode(e.target.value)}
                            className="border rounded-md p-2 w-full max-w-xs"
                        />
                    </div>
                )}

                {/* --- Barra de ações: Voltar | Ação (Enviar/Confirmar) | Avançar --- */}
                <div className="flex justify-center space-x-4 mt-4">
                    {/* Voltar */}
                    <button
                        onClick={() => setStep('email')}
                        disabled={step === 'email'}
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    >
                        Voltar
                    </button>

                    {/* Botão de ação: envia código ou confirma login */}
                    <button
                        onClick={step === 'email' ? handleSendCode : handleConfirmCode}
                        disabled={
                            (step === 'email' && !inputEmail.includes('@')) ||
                            (step === 'code' && !inputCode)
                        }
                        className={`px-4 py-2 rounded text-white ${
                            step === 'email'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-green-600 hover:bg-green-700'
                        } disabled:bg-gray-400`}
                    >
                        {step === 'email' ? 'Enviar Código' : 'Confirmar Código'}
                    </button>

                    {/* Avançar */}
                    <button
                        onClick={() => setStep('code')}
                        disabled={step === 'code'}
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    >
                        Avançar
                    </button>
                </div>

                {/* --- Mensagens de estado --- */}
                {hasEmail && (
                    <p className="text-green-600 font-medium mt-4">
                        ✅ Olá, {email}!
                    </p>
                )}
                {message && <p className="text-green-600 mt-2">{message}</p>}
                {error   && <p className="text-red-600 mt-2">{error}</p>}
            </div>

            <footer className="text-center text-gray-500">
                Clique nos logos do Vite e React para saber mais.
            </footer>
        </div>
    );


}

export default App;
