import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss() // TailwindCSS v4 Vite 플러그인
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api/external/coinGecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/external\/coinGecko/, '/api/v3'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/api/rss-proxy': {
        target: 'https://cointelegraph.com',  // RSS 소스 예시
        changeOrigin: true
      },
      '/api/news': {
        target: 'https://api.allorigins.win',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/news/, '')
      }
    },
    host: true, // 네트워크에서 접근 가능하도록 설정
    port: 5300
  },
  // headers: [
  //   {
  //     "source": "/(.*)",
  //     "headers": [
  //       {
  //         "key": "Access-Control-Allow-Origin",
  //         "value": "*"
  //       }
  //     ]
  //   }
  // ]
})
