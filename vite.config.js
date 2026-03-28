import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const chatTarget = (env.VITE_CHAT_SERVER_URL || '').replace(/\/+$/, '')

  return {
    plugins: [react()],
    server: chatTarget
      ? {
          proxy: {
            '/v1': {
              target: chatTarget,
              changeOrigin: true,
              secure: false,
              ws: true,
              timeout: 30_000,
              proxyTimeout: 30_000,
              headers: {
                // Helpful for ngrok tunnels that show a browser warning page.
                'ngrok-skip-browser-warning': 'true',
              },
              configure: (proxy) => {
                proxy.on('error', (err, req) => {
                  console.error(`[vite proxy] ${req?.method || ''} ${req?.url || ''} -> ${chatTarget} failed:`, err?.message || err)
                })
              },
            },
          },
        }
      : undefined,
  }
})
