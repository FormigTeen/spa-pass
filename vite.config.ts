import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'


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

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  if (command === 'build') {
    return {
      plugins: [react(), tailwindcss()],
    }
  }

  return {
    plugins: [react(), tailwindcss(), basicSsl()],
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
