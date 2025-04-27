import { useState, useEffect } from 'react';
import { browserSupportsWebAuthn, startRegistration, startAuthentication } from '@simplewebauthn/browser';
import viteLogo from '/vite.svg';
import reactLogo from './assets/react.svg';
import './App.css';

function App() {
    const [count, setCount] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [debugLog, setDebugLog] = useState('');

    useEffect(() => {
        if (!browserSupportsWebAuthn()) {
            setError("Seu navegador não suporta WebAuthn.");
        }
    }, []);

    const printDebug = (title: string, output: any) => {
        setDebugLog(prev => `${prev}\n// ${title}\n${JSON.stringify(output, null, 2)}\n`);
    };

    const handleRegister = async () => {
        setMessage('');
        setError('');
        setDebugLog('');

        try {
            const resp = await fetch('https://api-gateway.cvlb.tech/lambda/v1/manage-passkey?action=register', {
                headers: {
                    'X-Api-Key': 'TOOYB1KQ6-FAUW-IH4W-LIEF1T4AE6E',
                    'X-Ocelot-Auth': 'test@test.com'
                }
            });
            const response = await resp.json();
            const opts = response.data;
            printDebug('Registration Options', opts);

            const attResp = await startRegistration({ optionsJSON: opts });
            printDebug('Registration Response', attResp);

            const verificationResp = await fetch('https://api-gateway.cvlb.tech/lambda/v1/manage-passkey?action=verification', {
                method: 'POST',
                headers: {
                    'X-Api-Key': 'TOOYB1KQ6-FAUW-IH4W-LIEF1T4AE6E',
                    'X-Ocelot-Auth': 'test@test.com',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(attResp),
            });

            const responseVerificationJSON = await verificationResp.json();
            const verificationJSON = responseVerificationJSON.data;
            printDebug('Server Response', verificationJSON);

            if (verificationJSON?.verified) {
                setMessage('Authenticator registrado com sucesso!');
            } else {
                setError(`Erro na verificação: ${JSON.stringify(verificationJSON)}`);
            }
        } catch (error: any) {
            setError(`Erro: ${error.message || error}`);
        }
    };

    const handleAuthenticate = async () => {
        setMessage('');
        setError('');
        setDebugLog('');

        try {
            const resp = await fetch('https://api-gateway.cvlb.tech/lambda/v1/manage-passkey?action=register', {
                headers: {
                    'X-Api-Key': 'TOOYB1KQ6-FAUW-IH4W-LIEF1T4AE6E',
                    'X-Ocelot-Auth': 'test@test.com'
                }
            });
            const response = await resp.json();
            const opts = response.data;
            printDebug('Authentication Options', opts);

            const asseResp = await startAuthentication({ optionsJSON: opts });
            printDebug('Authentication Response', asseResp);

            const verificationResp = await fetch('/verify-authentication', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asseResp),
            });

            const verificationJSON = await verificationResp.json();
            printDebug('Server Response', verificationJSON);

            if (verificationJSON?.verified) {
                setMessage('Usuário autenticado com sucesso!');
            } else {
                setError(`Erro na autenticação: ${JSON.stringify(verificationJSON)}`);
            }
        } catch (error: any) {
            setError(`Erro: ${error.message || error}`);
        }
    };

    return (
        <>
            <div>
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
            </div>
            <h1>Vite + React (Passkey)</h1>

            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>Edit <code>src/App.tsx</code> and save to test HMR</p>
            </div>

            <div className="card">
                <button onClick={handleRegister}>🚪 Registrar Passkey</button>
                <button onClick={handleAuthenticate}>🔐 Autenticar com Passkey</button>

                {message && <p style={{ color: 'green' }}>{message}</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                <details style={{ marginTop: '10px' }}>
                    <summary>Debug Console</summary>
                    <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{debugLog}</pre>
                </details>
            </div>

            <p className="read-the-docs">
                Clique nos logos do Vite e React para saber mais.
            </p>
        </>
    );
}

export default App;
