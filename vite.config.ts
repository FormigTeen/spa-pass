import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { federation } from '@module-federation/vite'


/**
 * Dev is served from a subdomain of `pass.cvlb.tech`, not localhost, because
 * WebAuthn validates `rpId: "pass.cvlb.tech"` against the *page origin* before
 * any request happens. A proxy cannot change the page origin, so localhost can
 * never run the biometric flow.
 *
 * Requires, once:
 *   echo "127.0.0.1 local.pass.cvlb.tech" | sudo tee -a /etc/hosts
 *
 * Then open https://local.pass.cvlb.tech:5173 — HTTPS is required because the
 * session cookie is `Secure` and WebAuthn needs a secure context off localhost.
 */
const DEV_HOST = 'local.pass.cvlb.tech'
const CEV_GATEWAY = 'https://api-cev-gateway.cvlb.tech'

/**
 * The E-Chat widget arrives as a Module Federation remote, published by
 * ~/Codes/echat-app (see its README.mfe.md). React is shared as a singleton so
 * the widget runs on this app's copy instead of shipping a second one.
 */
const inchat = () =>
  federation({
    name: 'passkey_example',
    // The remote publishes no type archive; its contract lives in
    // src/types/inchat.d.ts instead.
    dts: false,
    remotes: {
      inchat: {
        type: 'module',
        name: 'inchat',
        entry: 'https://echat.cvlb.tech/_mfe/chat/remoteEntry.js',
      },
    },
    // Every entry the widget imports resolves to this app's copy — the
    // package roots alone are not enough, since `react-dom/client` is a share
    // key of its own and would otherwise come from inside the remote. React
    // also refuses to run against a react-dom of a different version, so
    // `react`/`react-dom` here are pinned to the version echat-app builds
    // against (19.2.3).
    shared: {
      react: { singleton: true, requiredVersion: false },
      'react/jsx-runtime': { singleton: true, requiredVersion: false },
      'react-dom': { singleton: true, requiredVersion: false },
      'react-dom/client': { singleton: true, requiredVersion: false },
    },
  })

// Module Federation loads the remote with a top-level await, which needs a
// target that supports it.
const build = { target: 'chrome89' } as const

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  if (command === 'build') {
    return {
      plugins: [react(), tailwindcss(), inchat()],
      build,
    }
  }

  return {
    plugins: [react(), tailwindcss(), basicSsl(), inchat()],
    build,
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: [DEV_HOST],
      watch: {
        // Tooling writes into these while the app is running, and each write
        // would otherwise force a full page reload.
        ignored: ['**/.playwright-mcp/**', '**/.claude/**', '**/dist/**'],
      },
      proxy: {
        '/gql/v1': {
          target: CEV_GATEWAY,
          changeOrigin: true,
          secure: true,
        },
        '/inbot/v1': {
          target: CEV_GATEWAY,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
